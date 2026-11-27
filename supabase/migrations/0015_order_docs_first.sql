-- Ahmed 8:40: documents/libraries/information group first; unclassified is a normal public department, last.
update repo.orgs set sort = v.s from (values (9,5),(10,6),(11,7),(13,8),(12,999)) as v(id,s) where repo.orgs.id = v.id;
update repo.orgs set name_ar = 'غير مصنّف' where id = 12;
update repo.orgs set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object('description','كتب عامة تغطي موضوعات متعددة ولا تنتمي إلى تخصص واحد واضح.') where id = 12;
