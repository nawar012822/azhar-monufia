-- 0007: a ban must not use 'infinity' (auth service answers 500 on it). Use a far date.
create or replace function repo.set_user_flags(p_user uuid, p_patch jsonb) returns void language plpgsql security definer
  set search_path = repo, public as $$
declare s repo.user_status; until_ts timestamptz;
begin
  perform repo.assert_can_manage(p_user, true);
  insert into repo.user_status (user_id) values (p_user) on conflict do nothing;
  select * into s from repo.user_status where user_id = p_user;
  if p_patch ? 'banned' then s.banned := (p_patch->>'banned')::boolean; end if;
  if p_patch ? 'suspend_days' then
    s.suspended_until := case when (p_patch->>'suspend_days')::int > 0 then now() + make_interval(days => (p_patch->>'suspend_days')::int) end;
  end if;
  if p_patch ? 'no_download' then s.no_download := (p_patch->>'no_download')::boolean; end if;
  if p_patch ? 'no_upload' then s.no_upload := (p_patch->>'no_upload')::boolean; end if;
  update repo.user_status set banned = s.banned, suspended_until = s.suspended_until, no_download = s.no_download,
         no_upload = s.no_upload, updated_by = auth.uid(), updated_at = now() where user_id = p_user;
  -- sign-in itself is stopped too (ban/suspend), and open sessions are closed
  until_ts := case when s.banned then '2999-12-31'::timestamptz when s.suspended_until > now() then s.suspended_until end;
  update auth.users set banned_until = until_ts where id = p_user;
  if until_ts is not null then
    begin delete from auth.sessions where user_id = p_user; exception when others then null; end;
  end if;
end $$;

update auth.users set banned_until='2999-12-31' where banned_until='infinity';

-- v1 hardening (public schema, old site): no anonymous inserts. The old site's deposit page requires login anyway.
-- Rollback: create policy "Enable insert access for all users" on public.items for insert to public with check (true);
--           create policy "Allow public upload to books" on storage.objects for insert to public with check (bucket_id='books');
drop policy if exists "Enable insert access for all users" on public.items;
drop policy if exists "Allow public upload to books" on storage.objects;
create policy "Authenticated upload to books" on storage.objects for insert to authenticated with check (bucket_id = 'books');
