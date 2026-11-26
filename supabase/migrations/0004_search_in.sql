-- Search/browse inside any node of the tree (university, faculty, department or sub-department).
-- SECURITY INVOKER: row-level security still applies, so only approved items are returned to visitors.
create function repo.search_in(p_org bigint, p_q text, p_collection bigint default null,
                               p_limit int default 20, p_offset int default 0)
returns table (id bigint, org_id bigint, collection_id bigint, title text, author text, abstract text,
               created_at timestamptz, rank real)
language sql stable as $$
  select i.id, i.org_id, i.collection_id, i.title, i.author, i.abstract, i.created_at,
         case when coalesce(trim(p_q),'') = '' then 0::real else ts_rank_cd(i.search, q.q) end
  from repo.items i
  join repo.orgs o on o.id = i.org_id
  join repo.orgs s on s.id = p_org
  left join lateral (select websearch_to_tsquery('simple', repo.ar_norm(p_q)) as q) q on true
  where i.status = 'approved'
    and (o.path = s.path or o.path like s.path || '/%')
    and (coalesce(trim(p_q),'') = '' or i.search @@ q.q)
    and (p_collection is null or i.collection_id = p_collection)
  order by 8 desc, i.id desc
  limit least(p_limit, 50) offset least(p_offset, 1000)
$$;
grant execute on function repo.search_in to anon, authenticated;
