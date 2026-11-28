-- Atomic token reservation for the chat assistant (applied 28 Nov after the owner approved it).
-- Why: the day's token ceiling was only counted AFTER the provider call, so two questions arriving
-- at the same moment could both pass the check and overshoot the free-plan token wall.
-- Additive only: chat_take2 and chat_add_tokens stay in place, so the previous deployment still works.
-- ROLLBACK: see ~/backup/rollback_0029.sql
-- Purpose: reserve the assistant's token budget atomically before the Groq call, and settle it after.
create or replace function repo.chat_reserve(
  p_secret text, p_key text, p_tokens int,
  p_user_cap int, p_total_cap int, p_token_cap int
) returns text
language plpgsql security definer set search_path = repo, public, extensions as $$
declare
  d date := (now() at time zone 'Africa/Cairo')::date;
  ok boolean; got int; res int := greatest(least(coalesce(p_tokens,0), 20000), 0);
begin
  select encode(digest(coalesce(p_secret,''),'sha256'),'hex') = secret_hash into ok
    from repo.chat_quota_cfg where id = 1;
  if ok is not true then return 'denied'; end if;
  if p_user_cap < 1 or p_total_cap < 1 or p_token_cap < 1 then return 'total'; end if;

  insert into repo.chat_usage(day,k,n) values (d,'*tokens',res)
    on conflict (day,k) do update set n = repo.chat_usage.n + res
    returning n into got;
  if got > p_token_cap then
    update repo.chat_usage set n = greatest(n - res, 0) where day=d and k='*tokens';
    return 'tokens';
  end if;

  insert into repo.chat_usage(day,k,n) values (d,p_key,1)
    on conflict (day,k) do update set n = repo.chat_usage.n + 1
    returning n into got;
  if got > p_user_cap then
    update repo.chat_usage set n = greatest(n - 1, 0) where day=d and k=p_key;
    update repo.chat_usage set n = greatest(n - res, 0) where day=d and k='*tokens';
    return 'user';
  end if;

  insert into repo.chat_usage(day,k,n) values (d,'*total',1)
    on conflict (day,k) do update set n = repo.chat_usage.n + 1
    returning n into got;
  if got > p_total_cap then
    update repo.chat_usage set n = greatest(n - 1, 0) where day=d and k='*total';
    update repo.chat_usage set n = greatest(n - 1, 0) where day=d and k=p_key;
    update repo.chat_usage set n = greatest(n - res, 0) where day=d and k='*tokens';
    return 'total';
  end if;

  return 'ok';
end $$;

create or replace function repo.chat_settle(p_secret text, p_reserved int, p_used int)
returns int
language plpgsql security definer set search_path = repo, public, extensions as $$
declare d date := (now() at time zone 'Africa/Cairo')::date; ok boolean; got int;
begin
  select encode(digest(coalesce(p_secret,''),'sha256'),'hex') = secret_hash into ok
    from repo.chat_quota_cfg where id = 1;
  if ok is not true then return -1; end if;
  if coalesce(p_used,0) = coalesce(p_reserved,0) then return 0; end if;
  update repo.chat_usage set n = greatest(n + coalesce(p_used,0) - coalesce(p_reserved,0), 0)
    where day=d and k='*tokens' returning n into got;
  return coalesce(got,0);
end $$;

revoke all on function repo.chat_reserve(text,text,int,int,int,int) from public;
revoke all on function repo.chat_settle(text,int,int) from public;
grant execute on function repo.chat_reserve(text,text,int,int,int,int) to anon, authenticated;
grant execute on function repo.chat_settle(text,int,int) to anon, authenticated;
