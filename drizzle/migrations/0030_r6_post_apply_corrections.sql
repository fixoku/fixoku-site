-- Corrections discovered after 0029 was applied. The original 0029 source
-- remains immutable so its Drizzle ledger hash stays authoritative.
UPDATE physical_products
SET is_active=false,
    legacy_code='R6_LEGACY_TRAINING_SERVICE',
    updated_at=now()
WHERE product_type='SERVICE'
  AND r6_product_type<>'TRAINING_SERVICE';
