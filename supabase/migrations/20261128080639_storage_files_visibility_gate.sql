-- Applied to production on 28 Nov 2026 10:06:39 Cairo (08:06:39Z) and recorded in
-- supabase_migrations.schema_migrations under version 20261128080639.
-- This file mirrors the applied statement exactly so the repository matches the database.
--
-- Enforce the same item-level visibility rules on private Storage objects.
-- A file object must not be downloadable merely because an item_files row exists.
drop policy if exists files_read on storage.objects;

create policy files_read
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'files'
  and not repo.blocked('download')
  and exists (
    select 1
    from repo.item_files f
    join repo.items i on i.id = f.item_id
    where f.bucket = 'files'
      and f.file_key = objects.name
      and (
        (
          i.status = 'approved'
          and (
            i.access = 'open'
            or (i.access = 'restricted' and auth.uid() is not null)
          )
        )
        or i.submitted_by = auth.uid()
        or repo.has_role(i.org_id, 'moderator'::repo.role_level)
      )
  )
);
