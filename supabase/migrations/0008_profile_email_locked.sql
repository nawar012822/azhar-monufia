-- 0008: profile email is always the real sign-in email (a user can no longer set it to someone else's address).
-- Rollback: drop trigger profiles_email_lock on repo.profiles; drop function repo.profiles_email_lock();
create or replace function repo.profiles_email_lock() returns trigger language plpgsql security definer
  set search_path = repo, public, auth as $$
begin
  select u.email into new.email from auth.users u where u.id = new.id;
  return new;
end $$;
drop trigger if exists profiles_email_lock on repo.profiles;
create trigger profiles_email_lock before insert or update on repo.profiles
  for each row execute function repo.profiles_email_lock();
