-- Files live in YOUR Supabase Storage (bucket "files"), never on another site.
-- Private bucket; object key = '<org_id>/<item_id>/<uuid>.pdf'. Reading goes through the same rules as repo.item_files
-- (so open / restricted / metadata / pending are enforced by the database); uploading needs the uploader role on that org.
-- App: supabase.storage.from('files').createSignedUrl(key, 60) with the USER's token, or a same-site route /files/<id>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('files', 'files', false, 52428800, array['application/pdf'])   -- 50MB = Free plan max; raise on Pro
on conflict (id) do update set public = false;

create policy files_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'files' and repo.has_role(((storage.foldername(name))[1])::bigint, 'uploader'));
create policy files_update_own on storage.objects for update to authenticated using (
  bucket_id = 'files' and owner = auth.uid());
create policy files_delete on storage.objects for delete to authenticated using (
  bucket_id = 'files' and (owner = auth.uid() or repo.has_role(((storage.foldername(name))[1])::bigint, 'admin')));
-- read = exactly what repo.item_files allows the caller to see (RLS of item_files applies inside this policy)
create policy files_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'files' and exists (select 1 from repo.item_files f where f.file_key = name));
