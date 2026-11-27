-- Department rename + display order (Ahmed, 8:37).
alter table repo.orgs add column if not exists sort int not null default 100;
update repo.orgs set name_ar = 'الوثائق' where id = 11 and name_ar = 'التوثيق';
update repo.orgs set sort = v.s from (values
  (7,10),(6,20),(5,30),(4,40),(3,50),(8,60),(9,70),(10,71),(11,72),(13,73),(12,999)
) as v(id,s) where repo.orgs.id = v.id;
