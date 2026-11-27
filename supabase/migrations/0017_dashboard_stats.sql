-- Dashboard numbers computed in the database (the page used to count only the newest 300 items).
-- security invoker: row level security still decides which items the caller can see.
create or replace function repo.dashboard_stats()
returns jsonb language sql stable security invoker set search_path = repo, public as $$
  select jsonb_build_object(
    'total', (select count(*) from repo.items),
    'approved', (select count(*) from repo.items where status = 'approved'),
    'pending', (select count(*) from repo.items where status = 'pending'),
    'views', coalesce((select sum(s.views) from repo.item_stats s join repo.items i on i.id = s.item_id), 0),
    'downloads', coalesce((select sum(s.downloads) from repo.item_stats s join repo.items i on i.id = s.item_id), 0),
    'by_collection', coalesce((select jsonb_object_agg(c.name_ar, n) from (select collection_id, count(*) n from repo.items group by 1) x join repo.collections c on c.id = x.collection_id), '{}'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'views', t.views)) from (select i.id, i.title, s.views from repo.items i join repo.item_stats s on s.item_id = i.id order by s.views desc, i.id desc limit 5) t), '[]'::jsonb)
  )
$$;
grant execute on function repo.dashboard_stats() to authenticated;
revoke execute on function repo.dashboard_stats() from public, anon; grant execute on function repo.dashboard_stats() to authenticated;
