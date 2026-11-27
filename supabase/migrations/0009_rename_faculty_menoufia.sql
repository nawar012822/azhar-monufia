-- 0009: the faculty is Al-Azhar University, Faculty of Arabic Language, Menoufia (not Shebin El-Kom).
-- Rollback: reverse the replace() calls and names (see the 0002 seed values).
update repo.orgs set
  path = replace(path, 'azhar/arabic-shebin', 'azhar/arabic-menoufia'),
  slug = case when slug = 'arabic-shebin' then 'arabic-menoufia' else slug end;
update repo.orgs set name_ar = 'كلية اللغة العربية بالمنوفية', name_en = 'Faculty of Arabic Language - Menoufia' where path = 'azhar/arabic-menoufia';
