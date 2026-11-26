-- Simple per-user controls for the super admin: role, ban, suspend, block downloads, block upload/publish, direct publish.
-- The department-scoped roles stay underneath (repo.memberships); these functions hide the detail from the screen.

alter table repo.platform_admins add column if not exists is_owner boolean not null default false;
update repo.platform_admins set is_owner = true
  where user_id = (select id from auth.users where lower(email) = 'ahmadnawar012822@gmail.com');

create table repo.user_status (
  user_id uuid primary key,
  banned boolean not null default false,            -- cannot sign in, all rights removed
  suspended_until timestamptz,                      -- same, until this time
  no_download boolean not null default false,       -- cannot open or download files
  no_upload boolean not null default false,         -- cannot upload, and cannot publish/approve
  updated_by uuid, updated_at timestamptz not null default now()
);
alter table repo.user_status enable row level security;
create policy status_self on repo.user_status for select using (user_id = auth.uid());
grant select on repo.user_status to authenticated;     -- writes only through repo.set_user_flags

-- true when the signed-in user is restricted. The owner is never restricted.
create or replace function repo.blocked(p_kind text) returns boolean language sql stable security definer
  set search_path = repo, public as $$
  select coalesce((
    select case when exists (select 1 from repo.platform_admins a where a.user_id = auth.uid() and a.is_owner) then false
      else s.banned or coalesce(s.suspended_until > now(), false)
           or (p_kind = 'upload' and s.no_upload) or (p_kind = 'download' and s.no_download) end
    from repo.user_status s where s.user_id = auth.uid()), false)
$$;

create or replace function repo.is_platform_admin() returns boolean language sql stable security definer
  set search_path = repo, public as $$
  select exists (select 1 from repo.platform_admins where user_id = auth.uid()) and not repo.blocked('all') $$;

create or replace function repo.has_role(p_org bigint, p_min repo.role_level) returns boolean
language sql stable security definer set search_path = repo, public as $$
  select not repo.blocked('all') and (repo.is_platform_admin() or exists (
    select 1 from repo.memberships m
    join repo.orgs mo on mo.id = m.org_id
    join repo.orgs t  on t.id  = p_org
    where m.user_id = auth.uid() and m.role >= p_min
      and (t.path = mo.path or t.path like mo.path || '/%')))
$$;
create or replace function repo.can_publish(p_org bigint) returns boolean
language sql stable security definer set search_path = repo, public as $$
  select not repo.blocked('upload') and (repo.has_role(p_org, 'moderator') or exists (
    select 1 from repo.memberships m
    join repo.orgs mo on mo.id = m.org_id
    join repo.orgs t  on t.id  = p_org
    where m.user_id = auth.uid() and m.can_publish and m.role >= 'uploader' and not repo.blocked('all')
      and (t.path = mo.path or t.path like mo.path || '/%')))
$$;

-- enforcement in the row rules
drop policy items_deposit on repo.items;
create policy items_deposit on repo.items for insert with check (
  auth.uid() is not null and submitted_by = auth.uid() and not repo.blocked('upload')
  and ((status in ('draft','pending') and repo.has_role(org_id, 'uploader'))
       or (status = 'approved' and repo.can_publish(org_id))
       or repo.has_role(org_id, 'moderator')));
drop policy items_owner_edit on repo.items;
create policy items_owner_edit on repo.items for update
  using (submitted_by = auth.uid() and status in ('draft','pending','rejected') and not repo.blocked('upload'))
  with check (submitted_by = auth.uid() and status in ('draft','pending') and repo.has_role(org_id, 'uploader'));
drop policy items_mod_edit on repo.items;
create policy items_mod_edit on repo.items for update
  using (repo.has_role(org_id, 'moderator') and not repo.blocked('upload'))
  with check (repo.has_role(org_id, 'moderator') and not repo.blocked('upload'));
drop policy files_read on repo.item_files;
create policy files_read on repo.item_files for select using (not repo.blocked('download') and exists (
  select 1 from repo.items i where i.id = item_id and (
       (i.status = 'approved' and (i.access = 'open' or (i.access = 'restricted' and auth.uid() is not null)))
    or i.submitted_by = auth.uid() or repo.has_role(i.org_id, 'moderator'))));
drop policy files_write on repo.item_files;
create policy files_write on repo.item_files for all
  using (not repo.blocked('upload') and exists (select 1 from repo.items i where i.id = item_id and (i.submitted_by = auth.uid() or repo.has_role(i.org_id,'moderator'))))
  with check (not repo.blocked('upload') and exists (select 1 from repo.items i where i.id = item_id
                      and (i.submitted_by = auth.uid() or repo.has_role(i.org_id,'moderator'))
                      and split_part(file_key, '/', 1) = i.org_id::text));
drop policy files_upload on storage.objects;
create policy files_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'files' and not repo.blocked('upload') and repo.has_role(((storage.foldername(name))[1])::bigint, 'uploader'));
drop policy files_read on storage.objects;
create policy files_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'files' and not repo.blocked('download') and exists (select 1 from repo.item_files f where f.file_key = name));

-- protect the owner: nobody (not even the owner by accident) can remove or change the owner's permissions from the site
create function repo.protect_owner_membership() returns trigger language plpgsql security definer set search_path = repo, public as $$
declare u uuid := coalesce(old.user_id, new.user_id);
begin
  if auth.uid() is not null and exists (select 1 from repo.platform_admins where user_id = u and is_owner) then
    raise exception 'the owner permissions cannot be changed';
  end if;
  return coalesce(new, old);
end $$;
create trigger memberships_protect_owner before insert or update or delete on repo.memberships
  for each row execute function repo.protect_owner_membership();
create function repo.protect_owner_admin() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and old.is_owner then raise exception 'the owner cannot be changed'; end if;
  return coalesce(new, old);
end $$;
create trigger platform_admins_protect_owner before update or delete on repo.platform_admins
  for each row execute function repo.protect_owner_admin();

-- who may act on whom: a super admin on ordinary users; only the owner on other super admins; nobody on the owner.
create function repo.assert_can_manage(p_target uuid, p_need_super boolean) returns void language plpgsql stable security definer
  set search_path = repo, public as $$
declare me uuid := auth.uid(); t_super boolean; t_owner boolean; me_owner boolean;
begin
  if me is null then raise exception 'sign in first'; end if;
  select coalesce(bool_or(true),false), coalesce(bool_or(is_owner),false) into t_super, t_owner from repo.platform_admins where user_id = p_target;
  select coalesce(bool_or(is_owner),false) into me_owner from repo.platform_admins where user_id = me;
  if t_owner then raise exception 'the owner cannot be changed'; end if;
  if p_need_super and not repo.is_platform_admin() then raise exception 'only the super admin can do this'; end if;
  if t_super and not me_owner then raise exception 'only the owner can change a super admin'; end if;
  if p_target = me and not me_owner then raise exception 'you cannot change yourself'; end if;
end $$;

-- ban / suspend / block download / block upload. patch keys: banned (bool), suspend_days (int, 0 clears), no_download, no_upload
create function repo.set_user_flags(p_user uuid, p_patch jsonb) returns void language plpgsql security definer
  set search_path = repo, public as $$
declare s repo.user_status; until_ts timestamptz;
begin
  perform repo.assert_can_manage(p_user, true);
  insert into repo.user_status (user_id) values (p_user) on conflict do nothing;
  select * into s from repo.user_status where user_id = p_user;
  if p_patch ? 'banned' then s.banned := (p_patch->>'banned')::boolean; end if;
  if p_patch ? 'suspend_days' then
    s.suspended_until := case when (p_patch->>'suspend_days')::int > 0 then now() + make_interval(days => (p_patch->>'suspend_days')::int) end;
  end if;
  if p_patch ? 'no_download' then s.no_download := (p_patch->>'no_download')::boolean; end if;
  if p_patch ? 'no_upload' then s.no_upload := (p_patch->>'no_upload')::boolean; end if;
  update repo.user_status set banned = s.banned, suspended_until = s.suspended_until, no_download = s.no_download,
         no_upload = s.no_upload, updated_by = auth.uid(), updated_at = now() where user_id = p_user;
  -- sign-in itself is stopped too (ban/suspend), and open sessions are closed
  until_ts := case when s.banned then '2999-12-31'::timestamptz when s.suspended_until > now() then s.suspended_until end;
  update auth.users set banned_until = until_ts where id = p_user;
  if until_ts is not null then
    begin delete from auth.sessions where user_id = p_user; exception when others then null; end;
  end if;
end $$;

-- role: 'member' (view and download only), 'uploader', 'moderator', 'admin'. Scope = the faculty/department it applies to.
create function repo.set_user_role(p_user uuid, p_role text, p_org bigint default null) returns void language plpgsql security definer
  set search_path = repo, public as $$
begin
  if repo.blocked('all') then raise exception 'not allowed'; end if;
  if p_role = 'member' then
    perform repo.assert_can_manage(p_user, false);
    if repo.is_platform_admin() then delete from repo.memberships where user_id = p_user;
    else delete from repo.memberships m where m.user_id = p_user and repo.has_role(m.org_id, 'admin'); end if;
    return;
  end if;
  if p_role not in ('uploader','moderator','admin') or p_org is null then raise exception 'bad role or scope'; end if;
  perform repo.assert_can_manage(p_user, p_role = 'admin');
  if not repo.has_role(p_org, 'admin') then raise exception 'you are not an admin of this scope'; end if;
  insert into repo.memberships (user_id, org_id, role) values (p_user, p_org, p_role::repo.role_level)
    on conflict (user_id, org_id) do update set role = excluded.role;
end $$;

create function repo.remove_user_role(p_user uuid, p_org bigint) returns void language plpgsql security definer
  set search_path = repo, public as $$
begin
  perform repo.assert_can_manage(p_user, false);
  if not repo.has_role(p_org, 'admin') then raise exception 'you are not an admin of this scope'; end if;
  delete from repo.memberships where user_id = p_user and org_id = p_org;
end $$;

create function repo.set_direct_publish(p_user uuid, p_on boolean) returns void language plpgsql security definer
  set search_path = repo, public as $$
begin
  perform repo.assert_can_manage(p_user, true);
  if not exists (select 1 from repo.memberships where user_id = p_user) then raise exception 'give the person a role first'; end if;
  update repo.memberships set can_publish = p_on where user_id = p_user;
end $$;

-- owner only: make or remove another super admin
create function repo.set_super_admin(p_user uuid, p_on boolean) returns void language plpgsql security definer
  set search_path = repo, public as $$
begin
  if not exists (select 1 from repo.platform_admins where user_id = auth.uid() and is_owner) or repo.blocked('all') then
    raise exception 'only the owner can do this'; end if;
  if exists (select 1 from repo.platform_admins where user_id = p_user and is_owner) then raise exception 'the owner cannot be changed'; end if;
  if p_on then insert into repo.platform_admins (user_id) values (p_user) on conflict do nothing;
  else delete from repo.platform_admins where user_id = p_user and not is_owner; end if;
end $$;

-- the list: ALL registered users for a super admin; for a faculty/department admin only the people inside their scope
create function repo.admin_users(p_q text default '', p_limit int default 50, p_offset int default 0)
returns table (id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz,
               is_owner boolean, is_super boolean, banned boolean, suspended_until timestamptz, no_download boolean, no_upload boolean,
               roles jsonb, total bigint)
language sql stable security definer set search_path = repo, public as $$
  with me as (select repo.is_platform_admin() as sup),
  base as (
    select u.id, u.email::text as email, u.created_at, u.last_sign_in_at
    from auth.users u, me
    where (me.sup or exists (select 1 from repo.memberships m where m.user_id = u.id and repo.has_role(m.org_id, 'admin')))
      and (coalesce(trim(p_q),'') = '' or u.email ilike '%' || trim(p_q) || '%'
           or exists (select 1 from repo.profiles p where p.id = u.id and p.full_name ilike '%' || trim(p_q) || '%'))
  )
  select b.id, b.email, p.full_name, b.created_at, b.last_sign_in_at,
         coalesce(a.is_owner, false), a.user_id is not null,
         coalesce(s.banned, false), s.suspended_until, coalesce(s.no_download, false), coalesce(s.no_upload, false),
         coalesce((select jsonb_agg(jsonb_build_object('org_id', m.org_id, 'org', o.name_ar, 'path', o.path, 'role', m.role, 'can_publish', m.can_publish))
                   from repo.memberships m join repo.orgs o on o.id = m.org_id where m.user_id = b.id), '[]'::jsonb),
         count(*) over ()
  from base b
  left join repo.profiles p on p.id = b.id
  left join repo.platform_admins a on a.user_id = b.id
  left join repo.user_status s on s.user_id = b.id
  order by (a.user_id is not null) desc, b.created_at desc
  limit least(p_limit, 100) offset p_offset
$$;
revoke execute on function repo.admin_users, repo.set_user_flags, repo.set_user_role, repo.remove_user_role, repo.set_direct_publish, repo.set_super_admin, repo.assert_can_manage from public, anon;
grant execute on function repo.admin_users, repo.set_user_flags, repo.set_user_role, repo.remove_user_role, repo.set_direct_publish, repo.set_super_admin to authenticated;
grant execute on function repo.blocked to anon, authenticated;
