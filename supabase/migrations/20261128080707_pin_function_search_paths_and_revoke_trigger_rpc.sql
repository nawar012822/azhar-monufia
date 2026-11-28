-- Applied to production on 28 Nov 2026 10:07:07 Cairo (08:07:07Z) and recorded in
-- supabase_migrations.schema_migrations under version 20261128080707.
-- This file mirrors the applied statements exactly so the repository matches the database.
--
-- Deep audit hardening: pin search_path on every function reported by Supabase.
-- Use only trusted schemas; pg_catalog is searched first.
alter function public.auto_confirm_users() set search_path = pg_catalog, auth, public, repo, extensions;
alter function repo.ar_norm(text) set search_path = pg_catalog, repo, public, extensions;
alter function repo.dept_tree(bigint) set search_path = pg_catalog, repo, public, extensions;
alter function repo.items_before() set search_path = pg_catalog, repo, public, extensions;
alter function repo.memberships_admin_lock() set search_path = pg_catalog, repo, public, extensions, auth;
alter function repo.memberships_guard() set search_path = pg_catalog, repo, public, extensions, auth;
alter function repo.orgs_before() set search_path = pg_catalog, repo, public, extensions;
alter function repo.orgs_lock_tree() set search_path = pg_catalog, repo, public, extensions, auth;
alter function repo.protect_last_admin() set search_path = pg_catalog, repo, public, extensions, auth;
alter function repo.protect_owner_admin() set search_path = pg_catalog, repo, public, extensions, auth;
alter function repo.search_in(bigint,text,bigint,integer,integer,text,integer,integer,text) set search_path = pg_catalog, repo, public, extensions;
alter function repo.search_items(bigint,bigint,text,bigint,integer,integer) set search_path = pg_catalog, repo, public, extensions;
alter function repo.suggest(bigint,text,integer) set search_path = pg_catalog, repo, public, extensions;

-- These are trigger/event-trigger entry points, not client RPCs.
-- Trigger execution does not require callers to hold EXECUTE privileges.
revoke all on function public.auto_confirm_users() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
