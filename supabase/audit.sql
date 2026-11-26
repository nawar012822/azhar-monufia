-- READ-ONLY audit. Run in Supabase > SQL Editor. It changes nothing.
-- Send the output back so the access rules can be checked against the app.

-- 1) Which tables have RLS on
select schemaname, tablename, rowsecurity from pg_tables where schemaname = 'public';

-- 2) Every policy that exists today
select tablename, policyname, cmd, roles, qual, with_check from pg_policies
where schemaname in ('public','storage') order by tablename, policyname;

-- 3) Is the "books" bucket public (restricted files are reachable by URL if so)
select id, name, public from storage.buckets;

-- What the app expects (verify against the output above before changing anything):
--  items:     anon SELECT only where status = 'approved'; authenticated INSERT with
--             submitted_by = auth.uid() and status = 'pending'; UPDATE/DELETE only for
--             profiles.role in ('admin','moderator'); views/downloads updated via a
--             SECURITY DEFINER function rather than open UPDATE.
--  profiles:  user can read/update own row except "role"; only admin can change role.
--  favorites: user can read/insert/delete own rows only.
