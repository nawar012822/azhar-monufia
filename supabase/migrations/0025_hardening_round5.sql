-- 1) item_exists no longer reveals whether an unpublished item exists: it only says whether the id is inside the used range.
--    ROLLBACK: create or replace function repo.item_exists(p_id bigint) returns boolean language sql stable security definer set search_path = repo, public as 'select exists(select 1 from repo.items where id = p_id)';
create or replace function repo.item_exists(p_id bigint) returns boolean
language sql stable security definer set search_path = repo, public as
$$ select p_id >= 1 and p_id <= coalesce((select max(id) from repo.items), 0) $$;

-- 2) Only super admins / the owner can delete departments. Insert and update stay with scoped admins.
--    ROLLBACK: drop policy orgs_ins/orgs_upd/orgs_del on repo.orgs; create policy orgs_write on repo.orgs for all using (repo.has_role(id,'admin')) with check (repo.has_role(coalesce(parent_id,id),'admin'));
drop policy if exists orgs_write on repo.orgs;
create policy orgs_ins on repo.orgs for insert with check (repo.has_role(coalesce(parent_id, id), 'admin'::repo.role_level));
create policy orgs_upd on repo.orgs for update using (repo.has_role(id, 'admin'::repo.role_level)) with check (repo.has_role(coalesce(parent_id, id), 'admin'::repo.role_level));
create policy orgs_del on repo.orgs for delete using (repo.is_platform_admin());

-- 3) Only super admins / the owner can change or remove an existing admin membership.
--    ROLLBACK: drop trigger memberships_admin_lock on repo.memberships;
create or replace function repo.memberships_admin_lock() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and old.role = 'admin' and not repo.is_platform_admin() then
    raise exception 'only the super admin can change or remove an administrator';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists memberships_admin_lock on repo.memberships;
create trigger memberships_admin_lock before update or delete on repo.memberships for each row execute function repo.memberships_admin_lock();

-- 4) Daily quota for the research assistant (free model quota). One row per day and caller key (hashed IP), plus a total row.
--    ROLLBACK: drop function repo.chat_take(text,text,int,int); drop table repo.chat_usage, repo.chat_quota_cfg; and the app falls back to the per-minute limit (fails open).
create table if not exists repo.chat_usage (day date not null, k text not null, n int not null default 0, primary key (day, k));
create table if not exists repo.chat_quota_cfg (id int primary key default 1 check (id = 1), secret_hash text not null);
alter table repo.chat_usage enable row level security;
alter table repo.chat_quota_cfg enable row level security;
revoke all on repo.chat_usage, repo.chat_quota_cfg from anon, authenticated, public;
create or replace function repo.chat_take(p_secret text, p_key text, p_user_cap int, p_total_cap int) returns text
language plpgsql security definer set search_path = repo, public, extensions as $$
declare d date := (now() at time zone 'Africa/Cairo')::date; u int; t int; ok boolean;
begin
  select encode(digest(coalesce(p_secret,''), 'sha256'), 'hex') = secret_hash into ok from repo.chat_quota_cfg where id = 1;
  if ok is not true then return 'denied'; end if;
  delete from repo.chat_usage where day < d - 2;
  select n into t from repo.chat_usage where day = d and k = '*total';
  if coalesce(t, 0) >= p_total_cap then return 'total'; end if;
  select n into u from repo.chat_usage where day = d and k = p_key;
  if coalesce(u, 0) >= p_user_cap then return 'user'; end if;
  insert into repo.chat_usage(day, k, n) values (d, p_key, 1) on conflict (day, k) do update set n = repo.chat_usage.n + 1;
  insert into repo.chat_usage(day, k, n) values (d, '*total', 1) on conflict (day, k) do update set n = repo.chat_usage.n + 1;
  return 'ok';
end $$;
revoke all on function repo.chat_take(text,text,int,int) from public;
grant execute on function repo.chat_take(text,text,int,int) to anon, authenticated;
