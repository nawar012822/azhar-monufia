-- Real totals for the home page (not limited to the latest 200 items).
create or replace function repo.site_stats() returns jsonb
language sql stable security definer set search_path to 'repo','public' as $$
  select jsonb_build_object(
    'total', (select count(*) from repo.items where status='approved'),
    'views', coalesce((select sum(s.views) from repo.item_stats s join repo.items i on i.id=s.item_id where i.status='approved'),0),
    'by_collection', coalesce((select jsonb_object_agg(c.slug, n) from (select collection_id, count(*) n from repo.items where status='approved' group by 1) x join repo.collections c on c.id=x.collection_id),'{}'::jsonb)
  )
$$;
grant execute on function repo.site_stats() to anon, authenticated;
