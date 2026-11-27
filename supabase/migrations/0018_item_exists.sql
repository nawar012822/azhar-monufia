-- Lets the server answer a real 404 for ids that do not exist (pending items still exist, so owners keep working).
create or replace function repo.item_exists(p_id bigint) returns boolean
language sql stable security definer set search_path = repo, public as $$ select exists(select 1 from repo.items where id = p_id) $$;
grant execute on function repo.item_exists(bigint) to anon, authenticated;
