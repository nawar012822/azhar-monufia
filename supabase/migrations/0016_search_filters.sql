-- Search: adds publisher to the searched text and optional filters (language, year range, license group).
-- Old calls with named arguments keep working because all new parameters have defaults.
drop function if exists repo.search_in(bigint, text, bigint, int, int);
create function repo.search_in(p_org bigint, p_q text, p_collection bigint default null, p_limit int default 20, p_offset int default 0,
  p_lang text default null, p_year_from int default null, p_year_to int default null, p_license text default null)
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
    select i.*, repo.ar_norm(i.title) nt, repo.ar_norm(coalesce(i.author,'')||' '||coalesce(i.keywords,'')||' '||coalesce(i.publisher,'')) nk, repo.ar_norm(coalesce(i.abstract,'')) na
    from repo.items i
    join repo.orgs o on o.id = i.org_id
    join repo.orgs s on s.id = p_org
    where i.status = 'approved'
      and (o.path = s.path or o.path like s.path || '/%')
      and (p_collection is null or i.collection_id = p_collection)
      and (p_lang is null or p_lang = '' or i.language ilike '%'||p_lang||'%')
      and (p_year_from is null or substring(i.date_issued from '\d{4}')::int >= p_year_from)
      and (p_year_to is null or substring(i.date_issued from '\d{4}')::int <= p_year_to)
      and (p_license is null or p_license = '' or case p_license
            when 'pd' then i.rights ilike '%public domain%'
            when 'cc0' then i.rights ilike '%CC0%'
            when 'cc-by' then i.rights ~* 'CC BY' and i.rights !~* 'NC'
            when 'nc' then i.rights ~* 'NC'
            else true end)
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

grant execute on function repo.search_in(bigint, text, bigint, int, int, text, int, int, text) to anon, authenticated;
