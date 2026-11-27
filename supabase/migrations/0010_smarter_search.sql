-- Smarter search: same signature as before, so the site code does not change.
-- Matches word parts (بلاغ finds البلاغة), ignores a leading ال, ignores hamza/taa/diacritics,
-- and if no item has ALL words it returns items that have SOME words (best first).
create or replace function repo.search_in(p_org bigint, p_q text, p_collection bigint default null, p_limit int default 20, p_offset int default 0)
returns table(id bigint, org_id bigint, collection_id bigint, title text, author text, abstract text, created_at timestamptz, rank real)
language sql stable as $$
  with terms as (
    select distinct case when length(t) > 4 and t like 'ال%' then substr(t, 3) else t end as t
    from regexp_split_to_table(repo.ar_norm(left(coalesce(p_q,''), 100)), '[\s,،;؛:.؟?!"()]+') t
    where length(t) >= 3
    limit 8
  ),
  n as (select count(*)::int as c from terms),
  scope as (
    select i.*, repo.ar_norm(i.title) nt, repo.ar_norm(coalesce(i.author,'')||' '||coalesce(i.keywords,'')) nk, repo.ar_norm(coalesce(i.abstract,'')) na
    from repo.items i
    join repo.orgs o on o.id = i.org_id
    join repo.orgs s on s.id = p_org
    where i.status = 'approved'
      and (o.path = s.path or o.path like s.path || '/%')
      and (p_collection is null or i.collection_id = p_collection)
  ),
  scored as (
    select sc.id, sc.org_id, sc.collection_id, sc.title, sc.author, sc.abstract, sc.created_at,
      (select count(*) from terms t where sc.nt like '%'||replace(replace(t.t,'%','\%'),'_','\_')||'%' or sc.nk like '%'||replace(replace(t.t,'%','\%'),'_','\_')||'%' or sc.na like '%'||replace(replace(t.t,'%','\%'),'_','\_')||'%') as hit,
      (select count(*) from terms t where sc.nt like '%'||replace(replace(t.t,'%','\%'),'_','\_')||'%') * 3
      + (select count(*) from terms t where sc.nk like '%'||replace(replace(t.t,'%','\%'),'_','\_')||'%') * 2
      + (select count(*) from terms t where sc.na like '%'||replace(replace(t.t,'%','\%'),'_','\_')||'%') as pts
    from scope sc
  )
  select s.id, s.org_id, s.collection_id, s.title, s.author, s.abstract, s.created_at,
         case when (select c from n) = 0 then 0::real else (s.pts + s.hit * 10)::real end
  from scored s
  where (select c from n) = 0
     or s.hit = (select c from n)
     or (s.hit > 0 and not exists (select 1 from scored x where x.hit = (select c from n)))
  order by 8 desc, s.id desc
  limit least(p_limit, 50) offset least(p_offset, 1000)
$$;
