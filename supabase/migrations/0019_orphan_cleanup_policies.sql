-- Lets a depositor clean up their own failed deposit (file without record, or pending item without file).
create policy items_owner_discard on repo.items for delete to authenticated
  using (submitted_by = auth.uid() and status in ('draft','pending') and not exists (select 1 from repo.item_files f where f.item_id = items.id));
create policy files_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'files' and owner = auth.uid());
