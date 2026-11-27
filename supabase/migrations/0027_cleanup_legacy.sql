-- Cleanup of unused legacy objects (the app only uses the repo schema).
-- 1) Legacy admin-role function is unused: no longer callable through the API.
--    (public.is_admin stays: two policies on public.profiles still call it, revoking would make them error.)
revoke execute on function public.admin_set_user_role(uuid, text) from public, anon, authenticated;
-- 2) Legacy public tables: keep the rows, remove the extra table-level rights (RLS policies stay).
revoke truncate, references, trigger on public.items, public.favorites, public.profiles from anon, authenticated;
revoke insert, update, delete on public.items, public.favorites, public.profiles from anon;
-- 3) pg_trgm out of the public schema.
alter extension pg_trgm set schema extensions;
