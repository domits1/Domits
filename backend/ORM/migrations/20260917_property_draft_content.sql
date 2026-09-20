-- Pre-flight: confirm the target columns are absent and check current row count.
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'property_draft'
  AND table_schema = 'main'
  AND column_name IN ('name', 'address_line', 'property_type', 'capacity', 'bedrooms', 'bathrooms', 'status')
ORDER BY column_name ASC;

SELECT COUNT(*) AS existing_draft_rows FROM main.property_draft;

ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS address_line VARCHAR(500);

ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);

ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS capacity INT;

ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS bedrooms INT;

ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS bathrooms INT;

-- NOT NULL is not requested here: DSQL has no SET NOT NULL for an existing table's
-- column, so this column is nullable forever regardless of what the ADD COLUMN
-- grammar is given. DEFAULT applies to future writes only.
ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT';

-- Backfill: DEFAULT does not retroactively populate existing rows, so any draft
-- created before this migration ran will read status = NULL until this runs.
UPDATE main.property_draft SET status = 'DRAFT' WHERE status IS NULL;

-- Verification: all 7 columns present, no pre-existing row left with a NULL status.
SELECT table_schema, column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'property_draft'
  AND table_schema = 'main'
  AND column_name IN ('name', 'address_line', 'property_type', 'capacity', 'bedrooms', 'bathrooms', 'status')
ORDER BY column_name ASC;

SELECT COUNT(*) AS rows_with_null_status FROM main.property_draft WHERE status IS NULL;

-- Rollback: drop in reverse order. Last in the file; do not paste the file top to bottom.
ALTER TABLE main.property_draft DROP COLUMN IF EXISTS status;

ALTER TABLE main.property_draft DROP COLUMN IF EXISTS bathrooms;

ALTER TABLE main.property_draft DROP COLUMN IF EXISTS bedrooms;

ALTER TABLE main.property_draft DROP COLUMN IF EXISTS capacity;

ALTER TABLE main.property_draft DROP COLUMN IF EXISTS property_type;

ALTER TABLE main.property_draft DROP COLUMN IF EXISTS address_line;

ALTER TABLE main.property_draft DROP COLUMN IF EXISTS name;
