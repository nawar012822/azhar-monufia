-- Once an item is approved (published), its uploader can no longer replace or delete its file,
-- nor repoint item_files. Moderators/admins of the department still can.
create or replace function repo.file_is_published(p_key text) returns boolean
language sql stable security definer set search_path = repo, public as $$
  select exists (select 1 from repo.item_files f join repo.items i on i.id = f.item_id
                 where f.file_key = p_key and i.status = 'approved')
$$;
revoke all on function repo.file_is_published(text) from public;
grant execute on function repo.file_is_published(text) to authenticated;

drop policy if exists files_delete on storage.objects;
create policy files_delete on storage.objects for delete to authenticated using (
  bucket_id = 'files' and (
    (owner = auth.uid() and not repo.file_is_published(name))
    or repo.has_role(((storage.foldername(name))[1])::bigint, 'admin'::repo.role_level)));

drop policy if exists files_update_own on storage.objects;
create policy files_update_own on storage.objects for update to authenticated using (
  bucket_id = 'files' and owner = auth.uid() and not repo.file_is_published(name));

drop policy if exists files_write on repo.item_files;
create policy files_write on repo.item_files for all using (
  not repo.blocked('upload') and exists (select 1 from repo.items i where i.id = item_files.item_id
    and ((i.submitted_by = auth.uid() and i.status <> 'approved') or repo.has_role(i.org_id, 'moderator'::repo.role_level)))
) with check (
  not repo.blocked('upload') and exists (select 1 from repo.items i where i.id = item_files.item_id
    and ((i.submitted_by = auth.uid() and i.status <> 'approved') or repo.has_role(i.org_id, 'moderator'::repo.role_level))
    and split_part(item_files.file_key, '/', 1) = i.org_id::text)
);
