-- Atomic daily quota: each counter is taken with one conditional upsert (row lock), so parallel requests cannot pass the cap.
-- ROLLBACK: re-run ~/backup/chat_take_before_0026.sql (previous non-atomic version).
create or replace function repo.chat_take(p_secret text, p_key text, p_user_cap int, p_total_cap int) returns text
language plpgsql security definer set search_path = repo, public, extensions as $$
declare d date := (now() at time zone 'Africa/Cairo')::date; ok boolean; got int;
begin
  select encode(digest(coalesce(p_secret,''), 'sha256'), 'hex') = secret_hash into ok from repo.chat_quota_cfg where id = 1;
  if ok is not true then return 'denied'; end if;
  if p_user_cap < 1 or p_total_cap < 1 then return 'total'; end if;
  delete from repo.chat_usage where day < d - 2;
  -- per-visitor counter (atomic: the update only happens while below the cap)
  insert into repo.chat_usage(day, k, n) values (d, p_key, 1)
    on conflict (day, k) do update set n = repo.chat_usage.n + 1 where repo.chat_usage.n < p_user_cap
    returning n into got;
  if got is null then return 'user'; end if;
  -- total counter; if it is full, give the visitor's slot back
  got := null;
  insert into repo.chat_usage(day, k, n) values (d, '*total', 1)
    on conflict (day, k) do update set n = repo.chat_usage.n + 1 where repo.chat_usage.n < p_total_cap
    returning n into got;
  if got is null then
    update repo.chat_usage set n = n - 1 where day = d and k = p_key;
    return 'total';
  end if;
  return 'ok';
end $$;
revoke all on function repo.chat_take(text,text,int,int) from public;
grant execute on function repo.chat_take(text,text,int,int) to anon, authenticated;
