-- 0030: per-network daily cap for the assistant, on top of the per-browser cap.
-- Why: the per-browser id is chosen by the browser, so one person could mint endless ids and use up
-- the whole site's daily allowance. This also counts per network address (hashed by the server).
-- Additive: wraps repo.chat_reserve, touches no table definition and no existing function.
-- ROLLBACK: drop function if exists repo.chat_reserve_ip(text,text,text,int,int,int,int,int);
create or replace function repo.chat_reserve_ip(
  p_secret text, p_key text, p_ip_key text, p_tokens int,
  p_user_cap int, p_total_cap int, p_token_cap int, p_ip_cap int
) returns text
language plpgsql security definer set search_path = repo, public, extensions as $$
declare
  d date := (now() at time zone 'Africa/Cairo')::date;
  ok boolean; got int; r text;
begin
  select encode(digest(coalesce(p_secret,''),'sha256'),'hex') = secret_hash into ok
    from repo.chat_quota_cfg where id = 1;
  if ok is not true then return 'denied'; end if;
  if p_ip_key is not null and p_ip_cap >= 1 then
    insert into repo.chat_usage(day,k,n) values (d,'ip:'||p_ip_key,1)
      on conflict (day,k) do update set n = repo.chat_usage.n + 1
      returning n into got;
    if got > p_ip_cap then
      update repo.chat_usage set n = greatest(n - 1, 0) where day=d and k='ip:'||p_ip_key;
      return 'user';
    end if;
  end if;
  r := repo.chat_reserve(p_secret, p_key, p_tokens, p_user_cap, p_total_cap, p_token_cap);
  if r <> 'ok' and p_ip_key is not null and p_ip_cap >= 1 then
    update repo.chat_usage set n = greatest(n - 1, 0) where day=d and k='ip:'||p_ip_key;
  end if;
  return r;
end $$;
revoke all on function repo.chat_reserve_ip(text,text,text,int,int,int,int,int) from public;
grant execute on function repo.chat_reserve_ip(text,text,text,int,int,int,int,int) to anon, authenticated;
