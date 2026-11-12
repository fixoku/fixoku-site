-- FIXOKU R177: R167 staging-approved student training programs.
-- Preserve historical package versions and Owner free grants.
-- Requires matching canonical student package catalog.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

INSERT INTO training_programs
  (slug,title,short_description,audience,status)
VALUES
  ('fixoku-student-middle-reading-group','Ortaokul Hızlı Okuma Grup Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.','STUDENT','PUBLISHED'),
  ('fixoku-student-middle-reading-individual','Ortaokul Hızlı Okuma Bireysel Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.','STUDENT','PUBLISHED'),
  ('fixoku-student-primary-reading-group','İlkokul Hızlı Okuma Grup Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.','STUDENT','PUBLISHED'),
  ('fixoku-student-primary-reading-individual','İlkokul Hızlı Okuma Bireysel Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.','STUDENT','PUBLISHED')
ON CONFLICT (slug) DO NOTHING;

DO $fixoku_r177$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
    ('fixoku-student-middle-reading-group','Ortaokul Hızlı Okuma Grup Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.'),
    ('fixoku-student-middle-reading-individual','Ortaokul Hızlı Okuma Bireysel Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.'),
    ('fixoku-student-primary-reading-group','İlkokul Hızlı Okuma Grup Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.'),
    ('fixoku-student-primary-reading-individual','İlkokul Hızlı Okuma Bireysel Eğitimi','FIXOKU öğrenci paketine bağlı canlı eğitmen hizmeti.')
    ) AS wanted(slug,title,description)
    LEFT JOIN training_programs tp ON tp.slug=wanted.slug
    WHERE tp.id IS NULL
       OR tp.title IS DISTINCT FROM wanted.title
       OR tp.short_description IS DISTINCT FROM wanted.description
       OR tp.audience::text <> 'STUDENT'
       OR tp.status::text <> 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'R177_PROGRAM_DRIFT';
  END IF;
END
$fixoku_r177$;

INSERT INTO package_entitlement_definitions
  (package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp
  ON tp.slug='fixoku-student-middle-reading-individual'
WHERE p.slug='student-middle-platinum-egitim'
  AND pv.version_number=1
ON CONFLICT (package_version_id,training_program_id)
DO NOTHING;

INSERT INTO package_entitlement_definitions
  (package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp
  ON tp.slug='fixoku-student-middle-reading-group'
WHERE p.slug='student-middle-premium-egitim'
  AND pv.version_number=1
ON CONFLICT (package_version_id,training_program_id)
DO NOTHING;

INSERT INTO package_entitlement_definitions
  (package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp
  ON tp.slug='fixoku-student-primary-reading-individual'
WHERE p.slug='student-primary-platinum-egitim'
  AND pv.version_number=3
ON CONFLICT (package_version_id,training_program_id)
DO NOTHING;

INSERT INTO package_entitlement_definitions
  (package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp
  ON tp.slug='fixoku-student-primary-reading-individual'
WHERE p.slug='student-primary-platinum-egitim'
  AND pv.version_number=4
ON CONFLICT (package_version_id,training_program_id)
DO NOTHING;

INSERT INTO package_entitlement_definitions
  (package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp
  ON tp.slug='fixoku-student-primary-reading-individual'
WHERE p.slug='student-primary-platinum-egitim'
  AND pv.version_number=5
ON CONFLICT (package_version_id,training_program_id)
DO NOTHING;

INSERT INTO package_entitlement_definitions
  (package_version_id,training_program_id,delivery_mode)
SELECT pv.id,tp.id,'TRAINER_LED'
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN training_programs tp
  ON tp.slug='fixoku-student-primary-reading-group'
WHERE p.slug='student-primary-premium-egitim'
  AND pv.version_number=4
ON CONFLICT (package_version_id,training_program_id)
DO NOTHING;

DO $fixoku_r177_links$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
    ('student-middle-platinum-egitim','1','fixoku-student-middle-reading-individual'),
    ('student-middle-premium-egitim','1','fixoku-student-middle-reading-group'),
    ('student-primary-platinum-egitim','3','fixoku-student-primary-reading-individual'),
    ('student-primary-platinum-egitim','4','fixoku-student-primary-reading-individual'),
    ('student-primary-platinum-egitim','5','fixoku-student-primary-reading-individual'),
    ('student-primary-premium-egitim','4','fixoku-student-primary-reading-group')
    ) AS wanted(package_slug,version_number,program_slug)
    LEFT JOIN packages p ON p.slug=wanted.package_slug
    LEFT JOIN package_versions pv
      ON pv.package_id=p.id
     AND pv.version_number=wanted.version_number::integer
    LEFT JOIN training_programs tp ON tp.slug=wanted.program_slug
    LEFT JOIN package_entitlement_definitions ped
      ON ped.package_version_id=pv.id
     AND ped.training_program_id=tp.id
     AND ped.delivery_mode='TRAINER_LED'
    WHERE ped.id IS NULL
  ) THEN
    RAISE EXCEPTION 'R177_PACKAGE_LINK_DRIFT';
  END IF;
END
$fixoku_r177_links$;
COMMIT;
