-- Token-aware daily quota for the chat assistant.
-- Why: the provider's free plan stops at 200k tokens/day before it stops at request count,
-- so the day's budget must be counted in tokens too, not only in questions.
-- Additive only: the existing 4-argument chat_take stays untouched, so rolling the app back
-- to the previous deployment keeps working.
-- ROLLBACK: see ~/backup/rollback_0028.sql
create or replace function repo.chat_take2(p_secret text, p_key text, p_user_cap int, p_total_cap int, p_token_cap int)
returns text
language plpgsql security definer set search_path = repo, public, extensions as $$
declare d date := (now() at time zone 'Africa/Cairo')::date; ok boolean; got int; used int;
begin
  select encode(digest(coalesce(p_secret,''), 'sha256'), 'hex') = secret_hash into ok from repo.chat_quota_cfg where id = 1;
  if ok is not true then return 'denied'; end if;
  if p_user_cap < 1 or p_total_cap < 1 or p_token_cap < 1 then return 'total'; end if;

  -- Token budget first: once the day's tokens are spent, stop before counting another question.
  select n into used from repo.chat_usage where day = d and k = '*tokens';
  if coalesce(used, 0) >= p_token_cap then return 'tokens'; end if;

  delete from repo.chat_usage where day < d - 2;

  -- Per-visitor counter (atomic: the update only happens while below the cap).
  insert into repo.chat_usage(day, k, n) values (d, p_key, 1)
    on conflict (day, k) do update set n = repo.chat_usage.n + 1 where repo.chat_usage.n < p_user_cap
    returning n into got;
  if got is null then return 'user'; end if;

  -- Site total; if it is full, give the visitor's slot back.
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

-- Records what a finished answer really cost. Clamped so a bad value cannot poison the counter.
create or replace function repo.chat_add_tokens(p_secret text, p_tokens int)
returns int
language plpgsql security definer set search_path = repo, public, extensions as $$
declare d date := (now() at time zone 'Africa/Cairo')::date; ok boolean; got int;
begin
  select encode(digest(coalesce(p_secret,''), 'sha256'), 'hex') = secret_hash into ok from repo.chat_quota_cfg where id = 1;
  if ok is not true then return -1; end if;
  if coalesce(p_tokens, 0) <= 0 then return 0; end if;
  insert into repo.chat_usage(day, k, n) values (d, '*tokens', least(p_tokens, 20000))
    on conflict (day, k) do update set n = repo.chat_usage.n + least(p_tokens, 20000)
    returning n into got;
  return got;
end $$;

revoke all on function repo.chat_take2(text,text,int,int,int) from public;
revoke all on function repo.chat_add_tokens(text,int) from public;
grant execute on function repo.chat_take2(text,text,int,int,int) to anon, authenticated;
grant execute on function repo.chat_add_tokens(text,int) to anon, authenticated;
