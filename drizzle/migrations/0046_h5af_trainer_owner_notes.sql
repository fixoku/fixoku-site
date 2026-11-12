-- R81 canonicalizes the previously unjournaled 0032 H5AF migration.
-- The original source is preserved under migrations/legacy/ and is not part
-- of the Drizzle chain. This forward-only copy is safe for databases where
-- the table was already created manually and for databases upgraded from 0045.
CREATE TABLE IF NOT EXISTS r6_trainer_package_owner_notes (
  package_id uuid PRIMARY KEY REFERENCES packages(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 4000),
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE r6_trainer_package_owner_notes IS 'Owner-only private notes; never join to public/trainer package APIs';
