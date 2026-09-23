-- Preserve purchase provenance on the existing R6 qualification grants.
ALTER TABLE r6_trainer_qualification_grants
  ADD COLUMN IF NOT EXISTS source_order_id uuid REFERENCES trainer_package_orders(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_order_item_id uuid REFERENCES trainer_package_order_items(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_package_id uuid REFERENCES packages(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS r6_trainer_purchase_expertise_item_uq
  ON r6_trainer_qualification_grants (source_order_item_id, qualification_id)
  WHERE source='PURCHASE' AND source_order_item_id IS NOT NULL;

-- The new canonical paragraph pair follows migration 0031. Keep the mapping
-- on each version, including drafts, so publication cannot grant an unknown code.
INSERT INTO r6_trainer_package_qualification_map (package_version_id, qualification_id)
SELECT pv.id, q.id
FROM packages p
JOIN package_versions pv ON pv.package_id=p.id
JOIN r6_qualification_definitions q ON q.code IN ('MIDDLE_PARAGRAPH','HIGH_PARAGRAPH')
WHERE p.audience='TRAINER' AND p.catalog_scope='TRAINER_COMMERCE'
  AND p.slug='ortaokul-lise-paragraf-egitmen-egitimi-ikili-set'
ON CONFLICT (package_version_id, qualification_id) DO NOTHING;
