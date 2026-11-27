-- Account-linked reading list and recently viewed.
create table if not exists repo.user_lists (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id bigint not null references repo.items(id) on delete cascade,
  kind text not null check (kind in ('reading','recent')),
  at timestamptz not null default now(),
  primary key (user_id, item_id, kind)
);
create index if not exists user_lists_by_user on repo.user_lists (user_id, kind, at desc);
alter table repo.user_lists enable row level security;
create policy user_lists_own on repo.user_lists for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on repo.user_lists from anon;
grant select, insert, update, delete on repo.user_lists to authenticated;

-- Keep only the 20 newest 'recent' rows per user.
create or replace function repo.user_lists_trim() returns trigger language plpgsql security definer set search_path to 'repo','public' as $$
begin
  if new.kind = 'recent' then
    delete from repo.user_lists u where u.user_id = new.user_id and u.kind = 'recent'
      and (u.user_id, u.item_id) not in (select user_id, item_id from repo.user_lists where user_id = new.user_id and kind = 'recent' order by at desc limit 20);
  end if;
  return null;
end $$;
drop trigger if exists user_lists_trim on repo.user_lists;
create trigger user_lists_trim after insert on repo.user_lists for each row execute function repo.user_lists_trim();
