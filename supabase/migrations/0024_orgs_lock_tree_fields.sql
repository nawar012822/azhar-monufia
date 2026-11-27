-- Security fix: a department admin could UPDATE his own org (parent_id = null, path = 'azhar/%') and become
-- admin of every department, because roles are resolved by org path. Through the API, the tree fields of an org
-- (parent, path, slug, kind, root) can no longer be changed after creation. Names and sort order still can.
create or replace function repo.orgs_lock_tree() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (
       new.parent_id is distinct from old.parent_id or new.path is distinct from old.path or new.slug is distinct from old.slug
    or new.kind is distinct from old.kind or new.root_id is distinct from old.root_id or new.id is distinct from old.id) then
    raise exception 'the position of a department in the tree cannot be changed';
  end if;
  if new.path !~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$' then
    raise exception 'invalid organisation path';
  end if;
  return new;
end $$;
drop trigger if exists orgs_lock_tree on repo.orgs;
create trigger orgs_lock_tree before update on repo.orgs for each row execute function repo.orgs_lock_tree();
