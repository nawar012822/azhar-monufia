-- Seeds the first tenant (Al-Azhar > Arabic Language, Shebin El-Kom) and copies v1 data.
-- Non-destructive: reads public.items/profiles/favorites, never alters them. Safe to re-run? NO: run once.
insert into repo.orgs (slug, name_ar, name_en, kind)
  values ('azhar', 'جامعة الأزهر', 'Al-Azhar University', 'university');
insert into repo.orgs (parent_id, slug, name_ar, name_en, kind)
  select id, 'arabic-shebin', 'كلية اللغة العربية - شبين الكوم', 'Faculty of Arabic Language - Shebin El-Kom', 'faculty'
  from repo.orgs where slug = 'azhar' and parent_id is null;

with f as (select id from repo.orgs where path = 'azhar/arabic-shebin'),
c(key, slug, name_ar, icon, sort) as (values
 ('كتب ومراجع','books','الكتب والمراجع','📚',1), ('رسائل جامعية','theses','الرسائل الجامعية','🎓',2),
 ('أبحاث علمية','research','الأبحاث العلمية','🔬',3), ('مخطوطات','manuscripts','المخطوطات والتراث','📜',4),
 ('إنتاج هيئة التدريس','faculty-output','إنتاج أعضاء هيئة التدريس','🖋️',5), ('مشروعات الطلاب','student-projects','مشروعات الطلاب','📝',6),
 ('الدوريات والمجلات','periodicals','الدوريات والمجلات','📰',7), ('المحاضرات والمواد','lectures','المحاضرات والمواد التعليمية','🎧',8))
insert into repo.collections (org_id, slug, name_ar, icon, sort) select f.id, c.slug, c.name_ar, c.icon, c.sort from f, c;

-- v1 keeps the collection key in items.collection; keep it in metadata so nothing is lost.
-- Department tree of the Faculty of Arabic Language, Menoufia (Shebin El-Kom). Source: the departments already used by
-- his site (search page list) + public lists of the faculty (see ARCHITECTURE.md). Names/nesting must be confirmed by Ahmed.
create temp table _dept (name text primary key, org_id bigint);
do $$ declare fac bigint := (select id from repo.orgs where path='azhar/arabic-shebin'); nid bigint; doc bigint;
begin
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (fac,'usul-lugha','أصول اللغة','department') returning id into nid;      insert into _dept values ('أصول اللغة', nid);
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (fac,'nahw-sarf','النحو والصرف','department') returning id into nid;      insert into _dept values ('النحو والصرف', nid);
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (fac,'linguistics','اللغويات','department') returning id into nid;          insert into _dept values ('اللغويات', nid);
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (fac,'balagha-naqd','البلاغة والنقد','department') returning id into nid;   insert into _dept values ('البلاغة والنقد', nid);
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (fac,'adab-naqd','الأدب والنقد','department') returning id into nid;        insert into _dept values ('الأدب والنقد', nid);
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (fac,'history-civ','التاريخ والحضارة','department') returning id into nid;  insert into _dept values ('التاريخ والحضارة', nid);
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (fac,'documentation-libraries','الوثائق والمكتبات والمعلومات','department') returning id into doc;
  insert into _dept values ('الوثائق والمكتبات والمعلومات', doc), ('الوثائق والمكتبات', doc);   -- v1 data used the short name
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (doc,'libraries','المكتبات','department');
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (doc,'documentation','التوثيق','department');
  insert into repo.orgs (parent_id, slug, name_ar, kind) values (fac,'unclassified','غير مصنّف (بانتظار التصنيف)','department');
end $$;

insert into repo.profiles (id, email, full_name)
  select id, email, full_name from public.profiles on conflict do nothing;
-- v1 'admin' -> faculty admin, 'moderator' -> faculty moderator. Plain users get NO role (view/download only,
-- as decided). The university-level super admin is added separately: insert into repo.platform_admins.
insert into repo.memberships (user_id, org_id, role)
  select p.id, (select id from repo.orgs where path='azhar/arabic-shebin'),
         case p.role when 'admin' then 'admin'::repo.role_level else 'moderator' end
  from public.profiles p where p.role in ('admin','moderator');

create temp table _map (old_id bigint primary key, new_id bigint);
with ins as (
  insert into repo.items (org_id, collection_id, status, access, title, author, abstract, keywords, language,
                          date_issued, publisher, rights, isbn, pages, metadata, submitted_by, created_at)
  select coalesce((select d.org_id from _dept d where d.name = i.department), (select id from repo.orgs where path='azhar/arabic-shebin/unclassified')),
         (select c.id from repo.collections c where c.org_id=(select id from repo.orgs where path='azhar/arabic-shebin')
            and c.slug = case i.collection when 'كتب ومراجع' then 'books' when 'رسائل جامعية' then 'theses' when 'أبحاث علمية' then 'research'
              when 'مخطوطات' then 'manuscripts' when 'إنتاج هيئة التدريس' then 'faculty-output' when 'مشروعات الطلاب' then 'student-projects'
              when 'الدوريات والمجلات' then 'periodicals' when 'المحاضرات والمواد' then 'lectures' else 'books' end),
         coalesce(nullif(i.status,''),'pending')::repo.item_status, coalesce(nullif(i.access,''),'open')::repo.access_level,
         i.title, i.author, i.abstract, i.keywords, coalesce(i.language,'ar'), i.date_issued::text, i.publisher, i.rights, i.isbn,
         nullif(i.pages,0), jsonb_build_object('v1_id', i.id, 'v1_collection', i.collection, 'supervisor', i.supervisor,
                                              'contributors', i.contributors, 'subjects', i.subjects),
         i.submitted_by, i.created_at
  from public.items i order by i.id
  returning id, (metadata->>'v1_id')::bigint as old_id)
insert into _map select old_id, id from ins;

insert into repo.item_files (item_id, bucket, file_key)
  select m.new_id, 'books', regexp_replace(i.file_url, '^.*/object/public/books/', '')
  from public.items i join _map m on m.old_id = i.id where i.file_url is not null;
insert into repo.item_stats (item_id, views, downloads)
  select m.new_id, coalesce(i.views,0), coalesce(i.downloads,0) from public.items i join _map m on m.old_id=i.id;
insert into repo.favorites (user_id, item_id)
  select f.user_id, m.new_id from public.favorites f join _map m on m.old_id = f.item_id::bigint on conflict do nothing;
