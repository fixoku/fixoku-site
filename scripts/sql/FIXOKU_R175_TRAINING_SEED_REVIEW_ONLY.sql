-- FIXOKU R175 | REVIEW-ONLY PROGRAM SEED
-- DO NOT AUTO-APPLY. Production approval required.
-- Program titles and package versions verified on staging.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $$ BEGIN
  IF current_setting('fixoku.r175_approved',true)
     IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'R175_NOT_APPROVED';
  END IF;
END $$;
INSERT INTO training_programs(slug,title,short_description,audience,status)
VALUES ('fixoku-student-middle-reading-group','Ortaokul Hızlı Okuma Grup Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.','STUDENT','PUBLISHED')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_programs(slug,title,short_description,audience,status)
VALUES ('fixoku-student-middle-reading-individual','Ortaokul Hızlı Okuma Bireysel Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.','STUDENT','PUBLISHED')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_programs(slug,title,short_description,audience,status)
VALUES ('fixoku-student-primary-reading-group','İlkokul Hızlı Okuma Grup Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.','STUDENT','PUBLISHED')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_programs(slug,title,short_description,audience,status)
VALUES ('fixoku-student-primary-reading-individual','İlkokul Hızlı Okuma Bireysel Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.','STUDENT','PUBLISHED')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO package_entitlement_definitions(package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp ON tp.slug='fixoku-student-middle-reading-individual'
WHERE p.slug='student-middle-platinum-egitim'
  AND pv.version_number=1
  AND tp.audience='STUDENT'
ON CONFLICT (package_version_id,training_program_id) DO NOTHING;
INSERT INTO package_entitlement_definitions(package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp ON tp.slug='fixoku-student-middle-reading-group'
WHERE p.slug='student-middle-premium-egitim'
  AND pv.version_number=1
  AND tp.audience='STUDENT'
ON CONFLICT (package_version_id,training_program_id) DO NOTHING;
INSERT INTO package_entitlement_definitions(package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp ON tp.slug='fixoku-student-primary-reading-individual'
WHERE p.slug='student-primary-platinum-egitim'
  AND pv.version_number=3
  AND tp.audience='STUDENT'
ON CONFLICT (package_version_id,training_program_id) DO NOTHING;
INSERT INTO package_entitlement_definitions(package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp ON tp.slug='fixoku-student-primary-reading-individual'
WHERE p.slug='student-primary-platinum-egitim'
  AND pv.version_number=4
  AND tp.audience='STUDENT'
ON CONFLICT (package_version_id,training_program_id) DO NOTHING;
INSERT INTO package_entitlement_definitions(package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp ON tp.slug='fixoku-student-primary-reading-individual'
WHERE p.slug='student-primary-platinum-egitim'
  AND pv.version_number=5
  AND tp.audience='STUDENT'
ON CONFLICT (package_version_id,training_program_id) DO NOTHING;
INSERT INTO package_entitlement_definitions(package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp ON tp.slug='fixoku-student-primary-reading-group'
WHERE p.slug='student-primary-premium-egitim'
  AND pv.version_number=4
  AND tp.audience='STUDENT'
ON CONFLICT (package_version_id,training_program_id) DO NOTHING;
COMMIT;
