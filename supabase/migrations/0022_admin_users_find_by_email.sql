-- A scoped admin can open the card of a registered user who has no role yet (exact email match only),
-- so the first role can be granted. Roles shown stay limited to the admin's own scope (0021).
-- Also pin the search_path of the legacy public.handle_new_user trigger function.
alter function public.handle_new_user() set search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION repo.admin_users(p_q text DEFAULT ''::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, email text, full_name text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, is_owner boolean, is_super boolean, banned boolean, suspended_until timestamp with time zone, no_download boolean, no_upload boolean, roles jsonb, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'repo', 'public'
AS $function$
  with me as (select repo.is_platform_admin() as sup),
  base as (
    select u.id, u.email::text as email, u.created_at, u.last_sign_in_at
    from auth.users u, me
    where (me.sup or exists (select 1 from repo.memberships m where m.user_id = u.id and repo.has_role(m.org_id, 'admin'))
           or (coalesce(trim(p_q),'') <> '' and lower(u.email) = lower(trim(p_q))
               and exists (select 1 from repo.memberships a where a.user_id = auth.uid() and a.role = 'admin')))
      and (coalesce(trim(p_q),'') = '' or u.email ilike '%' || trim(p_q) || '%'
           or exists (select 1 from repo.profiles p where p.id = u.id and p.full_name ilike '%' || trim(p_q) || '%'))
  )
  select b.id, b.email, p.full_name, b.created_at, b.last_sign_in_at,
         coalesce(a.is_owner, false), a.user_id is not null,
         coalesce(s.banned, false), s.suspended_until, coalesce(s.no_download, false), coalesce(s.no_upload, false),
         coalesce((select jsonb_agg(jsonb_build_object('org_id', m.org_id, 'org', o.name_ar, 'path', o.path, 'role', m.role, 'can_publish', m.can_publish))
                   from repo.memberships m join repo.orgs o on o.id = m.org_id where m.user_id = b.id and ((select sup from me) or repo.has_role(m.org_id, 'admin'))), '[]'::jsonb),
         count(*) over ()
  from base b
  left join repo.profiles p on p.id = b.id
  left join repo.platform_admins a on a.user_id = b.id
  left join repo.user_status s on s.user_id = b.id
  order by (a.user_id is not null) desc, b.created_at desc
  limit least(p_limit, 100) offset p_offset
$function$;
