-- Limit view/download counter abuse: one count per visitor per item per window,
-- plus a per-item hourly ceiling. Visitor key = network address header + browser id.
create table if not exists repo.bump_log (
  item_id bigint not null, kind text not null, visitor text not null, at timestamptz not null default now()
);
create index if not exists bump_log_lookup on repo.bump_log (item_id, kind, visitor, at desc);
create index if not exists bump_log_at on repo.bump_log (at);
alter table repo.bump_log enable row level security;  -- no policies: only the function below touches it

create or replace function repo.bump(p_item bigint, p_kind text)
returns void language plpgsql security definer set search_path to 'repo','public' as $$
declare
  h json; v text; win interval;
begin
  if p_kind not in ('view','download') then return; end if;
  if not exists (select 1 from repo.items where id = p_item and status = 'approved') then return; end if;
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  v := md5(coalesce(h->>'x-forwarded-for','') || '|' || coalesce(h->>'user-agent',''));
  win := case when p_kind = 'view' then interval '30 minutes' else interval '5 minutes' end;
  if exists (select 1 from repo.bump_log where item_id = p_item and kind = p_kind and visitor = v and at > now() - win) then return; end if;
  if (select count(*) from repo.bump_log where item_id = p_item and kind = p_kind and at > now() - interval '1 hour') >= 300 then return; end if;
  insert into repo.bump_log(item_id, kind, visitor) values (p_item, p_kind, v);
  if random() < 0.02 then delete from repo.bump_log where at < now() - interval '2 days'; end if;
  insert into repo.item_stats(item_id, views, downloads)
  values (p_item, (p_kind='view')::int, (p_kind='download')::int)
  on conflict (item_id) do update
    set views = repo.item_stats.views + (p_kind='view')::int,
        downloads = repo.item_stats.downloads + (p_kind='download')::int;
end $$;
