-- Multi-tenant repository core. Schema "repo" sits next to the current "public" tables,
-- so the live v1 site keeps working until cutover and rollback = point the app back.
-- Needs: Supabase (auth.uid(), roles anon/authenticated), extension pg_trgm.
create extension if not exists pg_trgm;
create schema if not exists repo;

create type repo.org_kind as enum ('university','faculty','department');
-- order matters: uploader < moderator < admin. Viewing/downloading needs NO role.
create type repo.role_level as enum ('uploader','moderator','admin');
create type repo.item_status as enum ('draft','pending','approved','rejected','withdrawn');
create type repo.access_level as enum ('open','restricted','metadata');

-- ---------- text normalisation (Arabic) ----------
create function repo.ar_norm(t text) returns text language sql immutable parallel safe as $$
  select lower(translate(
           regexp_replace(coalesce(t,''), '[\u064B-\u065F\u0670\u0640]', '', 'g'),
           'أإآٱىة', 'اااايه'))
$$;

-- ---------- tenants: university > faculty > department ----------
create table repo.orgs (
  id         bigint generated always as identity primary key,
  parent_id  bigint references repo.orgs(id),
  root_id    bigint not null,                       -- the university (self for roots)
  kind       repo.org_kind not null,
  slug       text not null check (slug ~ '^[a-z0-9-]+$'),
  path       text not null unique,                  -- 'azhar/arabic-menoufia'
  name_ar    text not null,
  name_en    text,
  settings   jsonb not null default '{}'::jsonb,    -- branding, labels, ...
  created_at timestamptz not null default now()
);
create index orgs_path_prefix on repo.orgs (path text_pattern_ops);
create index orgs_root on repo.orgs (root_id);

create function repo.orgs_before() returns trigger language plpgsql as $$
declare p repo.orgs;
begin
  if new.parent_id is null then
    new.path := new.slug; new.root_id := new.id; new.kind := 'university';
  else
    select * into p from repo.orgs where id = new.parent_id;
    if array_length(string_to_array(p.path,'/'),1) >= 7 then raise exception 'department tree too deep (max 5 levels under a faculty)'; end if;
    new.kind := case p.kind when 'university' then 'faculty'::repo.org_kind else 'department'::repo.org_kind end;
    new.path := p.path || '/' || new.slug; new.root_id := p.root_id;
  end if;
  return new;
end $$;
create trigger orgs_before before insert on repo.orgs for each row execute function repo.orgs_before();

create table repo.collections (
  id      bigint generated always as identity primary key,
  org_id  bigint not null references repo.orgs(id),
  slug    text not null check (slug ~ '^[a-z0-9-]+$'),
  name_ar text not null, name_en text, icon text, sort int not null default 0,
  unique (org_id, slug)
);
-- ---------- people ----------
create table repo.profiles (
  id uuid primary key,                    -- = auth.users.id
  email text, full_name text, orcid text, created_at timestamptz not null default now()
);
create table repo.memberships (
  user_id uuid not null, org_id bigint not null references repo.orgs(id),
  role repo.role_level not null default 'uploader',
  can_publish boolean not null default false,   -- direct publish without review; only the super admin may set it
  primary key (user_id, org_id)
);
create index memberships_org on repo.memberships (org_id, role);
create table repo.platform_admins (user_id uuid primary key);   -- written with the service key only

create function repo.is_platform_admin() returns boolean language sql stable security definer
  set search_path = repo, public as $$
  select exists (select 1 from repo.platform_admins where user_id = auth.uid()) $$;

-- Role at an org counts for every org below it (university admin administers its faculties).
create function repo.has_role(p_org bigint, p_min repo.role_level) returns boolean
language sql stable security definer set search_path = repo, public as $$
  select repo.is_platform_admin() or exists (
    select 1 from repo.memberships m
    join repo.orgs mo on mo.id = m.org_id
    join repo.orgs t  on t.id  = p_org
    where m.user_id = auth.uid() and m.role >= p_min
      and (t.path = mo.path or t.path like mo.path || '/%'))
$$;

-- Only the super admin appoints admins and gives direct-publish rights. (No end user = migration/service key = allowed.)
create function repo.memberships_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not repo.is_platform_admin() then
    if new.role = 'admin' then raise exception 'only the super admin can appoint an admin'; end if;
    if new.can_publish then raise exception 'only the super admin can allow direct publishing'; end if;
  end if;
  return new;
end $$;
create trigger memberships_guard before insert or update on repo.memberships
  for each row execute function repo.memberships_guard();

create function repo.can_publish(p_org bigint) returns boolean
language sql stable security definer set search_path = repo, public as $$
  select repo.has_role(p_org, 'moderator') or exists (
    select 1 from repo.memberships m
    join repo.orgs mo on mo.id = m.org_id
    join repo.orgs t  on t.id  = p_org
    where m.user_id = auth.uid() and m.can_publish and m.role >= 'uploader'
      and (t.path = mo.path or t.path like mo.path || '/%'))
$$;

create function repo.protect_last_admin() returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE' or new.role <> 'admin' or new.org_id <> old.org_id) and old.role = 'admin'
     and not exists (select 1 from repo.memberships
                     where org_id = old.org_id and role = 'admin' and user_id <> old.user_id) then
    raise exception 'cannot remove the last administrator of this organisation';
  end if;
  return coalesce(new, old);
end $$;
create trigger memberships_last_admin before update or delete on repo.memberships
  for each row execute function repo.protect_last_admin();

-- profile row is created automatically at sign-up (v1 relied on an unseen trigger; this makes it explicit)
create function repo.handle_new_user() returns trigger language plpgsql security definer set search_path = repo, public as $$
begin
  insert into repo.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name') on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created_repo after insert on auth.users for each row execute function repo.handle_new_user();

-- ---------- items ----------
create table repo.items (
  id           bigint generated always as identity primary key,
  org_id       bigint not null references repo.orgs(id),
  root_id      bigint not null,                      -- denormalised university, set by trigger
  faculty_id   bigint,                              -- nearest faculty (self/ancestor), set by trigger
  collection_id bigint references repo.collections(id),
  status       repo.item_status not null default 'pending',
  access       repo.access_level not null default 'open',
  title        text not null check (length(title) between 1 and 500),
  author       text, abstract text, keywords text, language text default 'ar',
  date_issued  text, publisher text, rights text, isbn text, pages int,
  metadata     jsonb not null default '{}'::jsonb,
  submitted_by uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  search tsvector generated always as (
      setweight(to_tsvector('simple', repo.ar_norm(title)), 'A')
   || setweight(to_tsvector('simple', repo.ar_norm(coalesce(author,''))), 'B')
   || setweight(to_tsvector('simple', repo.ar_norm(coalesce(keywords,''))), 'B')
   || setweight(to_tsvector('simple', repo.ar_norm(coalesce(abstract,''))), 'C')) stored
);
-- feeds (keyset pagination on created_at,id), per org and per university
create index items_feed_org   on repo.items (org_id,  created_at desc, id desc) where status = 'approved';
create index items_feed_root  on repo.items (root_id, created_at desc, id desc) where status = 'approved';
create index items_feed_fac   on repo.items (faculty_id, created_at desc, id desc) where status = 'approved';
create index items_feed_coll  on repo.items (collection_id, created_at desc, id desc) where status = 'approved';
create index items_owner      on repo.items (submitted_by, created_at desc);
create index items_review     on repo.items (org_id, created_at desc) where status = 'pending';
-- search
create index items_fts  on repo.items using gin (search) where status = 'approved';
create index items_trgm on repo.items using gin (repo.ar_norm(title) gin_trgm_ops) where status = 'approved';

create function repo.items_before() returns trigger language plpgsql as $$
begin
  select o.root_id, (select f.id from repo.orgs f where f.kind = 'faculty'
                      and (o.path = f.path or o.path like f.path || '/%') limit 1)
    into new.root_id, new.faculty_id from repo.orgs o where o.id = new.org_id;
  new.updated_at := now();
  -- every item must sit in a department (or sub-department): that is the classification rule
  if (select kind from repo.orgs where id = new.org_id) <> 'department' then
    raise exception 'items must be filed under a department, not a university or faculty';
  end if;
  if new.status = 'approved' and new.collection_id is null then
    raise exception 'approved items need a collection (type of material)';
  end if;
  return new;
end $$;
create trigger items_before before insert or update on repo.items for each row execute function repo.items_before();

-- file info lives apart so "metadata only" / "restricted" can be enforced by RLS, not by the UI.
create table repo.item_files (
  item_id bigint primary key references repo.items(id) on delete cascade,
  bucket text not null default 'files',    -- 'books' = old public bucket (legacy files), 'files' = new private bucket
  file_key text not null,                  -- object key inside that bucket
  size_bytes bigint, mime text, sha256 text
);
-- counters live apart: no hot-row writes on items
create table repo.item_stats (item_id bigint primary key references repo.items(id) on delete cascade,
  views bigint not null default 0, downloads bigint not null default 0);
create table repo.favorites (
  user_id uuid not null, item_id bigint not null references repo.items(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, item_id));

-- change feed for an external search engine (Typesense/Meilisearch/OpenSearch) when needed
create table repo.search_outbox (
  seq bigint generated always as identity primary key,
  item_id bigint not null, op text not null, at timestamptz not null default now());
create function repo.items_outbox() returns trigger language plpgsql security definer set search_path = repo, public as $$
begin
  insert into repo.search_outbox(item_id, op) values (coalesce(new.id, old.id), lower(tg_op));
  return null;
end $$;
create trigger items_outbox after insert or update or delete on repo.items
  for each row execute function repo.items_outbox();

create function repo.bump(p_item bigint, p_kind text) returns void language sql security definer
  set search_path = repo, public as $$
  insert into repo.item_stats(item_id, views, downloads)
  select i.id, (p_kind = 'view')::int, (p_kind = 'download')::int from repo.items i
   where i.id = p_item and i.status = 'approved' and p_kind in ('view','download')
  on conflict (item_id) do update
    set views = repo.item_stats.views + (p_kind = 'view')::int,
        downloads = repo.item_stats.downloads + (p_kind = 'download')::int
$$;

-- ---------- query API (SECURITY INVOKER: RLS applies) ----------
create function repo.search_items(p_root bigint, p_faculty bigint, p_q text, p_collection bigint default null,
                                  p_limit int default 20, p_offset int default 0)
returns table (id bigint, org_id bigint, collection_id bigint, title text, author text, created_at timestamptz, rank real)
language sql stable as $$
  select i.id, i.org_id, i.collection_id, i.title, i.author, i.created_at, ts_rank_cd(i.search, q.q)
  from repo.items i, websearch_to_tsquery('simple', repo.ar_norm(p_q)) q(q)
  where i.status = 'approved' and i.search @@ q.q
    and (p_root is null or i.root_id = p_root) and (p_faculty is null or i.faculty_id = p_faculty)
    and (p_collection is null or i.collection_id = p_collection)
  order by 7 desc, i.id desc
  limit least(p_limit, 50) offset least(p_offset, 1000)
$$;
-- navigation: the department tree of a faculty (sub-departments to any depth up to the cap)
create function repo.dept_tree(p_faculty bigint)
returns table (id bigint, parent_id bigint, name_ar text, path text, depth int) language sql stable as $$
  select o.id, o.parent_id, o.name_ar, o.path,
         array_length(string_to_array(o.path,'/'),1) - array_length(string_to_array(f.path,'/'),1)
  from repo.orgs f join repo.orgs o on o.path like f.path || '/%'
  where f.id = p_faculty order by o.path
$$;
create function repo.suggest(p_root bigint, p_q text, p_limit int default 8)
returns table (id bigint, title text) language sql stable as $$
  select i.id, i.title from repo.items i
  where i.status = 'approved' and (p_root is null or i.root_id = p_root)
    and repo.ar_norm(i.title) like '%' || repo.ar_norm(p_q) || '%'
  order by i.created_at desc limit least(p_limit, 20)
$$;

-- ---------- row level security ----------
alter table repo.orgs enable row level security;        alter table repo.collections enable row level security;
alter table repo.profiles enable row level security;
alter table repo.memberships enable row level security; alter table repo.platform_admins enable row level security;
alter table repo.items enable row level security;       alter table repo.item_files enable row level security;
alter table repo.item_stats enable row level security;  alter table repo.favorites enable row level security;
alter table repo.search_outbox enable row level security;

create policy orgs_read on repo.orgs for select using (true);
create policy orgs_write on repo.orgs for all using (repo.has_role(id, 'admin')) with check (repo.has_role(coalesce(parent_id, id), 'admin'));
create policy coll_read on repo.collections for select using (true);
create policy coll_write on repo.collections for all using (repo.has_role(org_id, 'admin')) with check (repo.has_role(org_id, 'admin'));
create policy prof_self on repo.profiles for select using (id = auth.uid());
create policy prof_admin on repo.profiles for select using (exists (
  select 1 from repo.memberships m where m.user_id = repo.profiles.id and repo.has_role(m.org_id, 'admin')));
create policy prof_ins on repo.profiles for insert with check (id = auth.uid());
create policy prof_upd on repo.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy mem_self on repo.memberships for select using (user_id = auth.uid());
create policy mem_admin_read on repo.memberships for select using (repo.has_role(org_id, 'admin'));
create policy mem_admin_write on repo.memberships for all using (repo.has_role(org_id, 'admin')) with check (repo.has_role(org_id, 'admin'));

create policy items_read on repo.items for select using (
  status = 'approved' or submitted_by = auth.uid() or repo.has_role(org_id, 'moderator'));
-- Upload is granted per org (department/faculty/university) to named people. Viewers cannot upload.
-- Uploaders submit for review; moderators/admins of the org may publish directly.
create policy items_deposit on repo.items for insert with check (
  auth.uid() is not null and submitted_by = auth.uid()
  and ((status in ('draft','pending') and repo.has_role(org_id, 'uploader'))
       or (status = 'approved' and repo.can_publish(org_id))       -- moderators/admins, or doctors the super admin allowed
       or repo.has_role(org_id, 'moderator')));
create policy items_owner_edit on repo.items for update
  using (submitted_by = auth.uid() and status in ('draft','pending','rejected'))
  with check (submitted_by = auth.uid() and status in ('draft','pending') and repo.has_role(org_id, 'uploader'));
create policy items_mod_edit on repo.items for update
  using (repo.has_role(org_id, 'moderator')) with check (repo.has_role(org_id, 'moderator'));
create policy items_admin_delete on repo.items for delete using (repo.has_role(org_id, 'admin'));

create policy files_read on repo.item_files for select using (exists (
  select 1 from repo.items i where i.id = item_id and (
       (i.status = 'approved' and (i.access = 'open' or (i.access = 'restricted' and auth.uid() is not null)))
    or i.submitted_by = auth.uid() or repo.has_role(i.org_id, 'moderator'))));
create policy files_write on repo.item_files for all
  using (exists (select 1 from repo.items i where i.id = item_id and (i.submitted_by = auth.uid() or repo.has_role(i.org_id,'moderator'))))
  with check (exists (select 1 from repo.items i where i.id = item_id
                      and (i.submitted_by = auth.uid() or repo.has_role(i.org_id,'moderator'))
                      and split_part(file_key, '/', 1) = i.org_id::text));   -- key must live in the item's own org folder

create policy stats_read on repo.item_stats for select using (true);
create policy fav_own on repo.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- search_outbox: no policy = only the service key reads it

-- ---------- grants (RLS decides rows) ----------
grant usage on schema repo to anon, authenticated;
grant select on repo.orgs, repo.collections, repo.items, repo.item_files, repo.item_stats to anon, authenticated;
grant insert, update, delete on repo.items, repo.item_files, repo.orgs, repo.collections, repo.memberships, repo.favorites to authenticated;
grant select, insert, update on repo.profiles to authenticated;
grant select on repo.memberships to authenticated;
grant select, insert, update, delete on repo.favorites to authenticated;
-- Admins find a person by email to grant them upload rights (they cannot list all users).
create function repo.find_user_by_email(p_email text) returns table (id uuid, email text, full_name text)
language sql stable security definer set search_path = repo, public as $$
  select p.id, p.email, p.full_name from repo.profiles p
  where lower(p.email) = lower(p_email)
    and (repo.is_platform_admin() or exists (select 1 from repo.memberships m where m.user_id = auth.uid() and m.role = 'admin'))
$$;
grant execute on function repo.search_items, repo.suggest, repo.bump, repo.has_role, repo.can_publish, repo.find_user_by_email, repo.dept_tree to anon, authenticated;
revoke execute on function repo.find_user_by_email from anon;
