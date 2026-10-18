SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'property_task'
  AND column_name = 'source';

ALTER TABLE main.property_task
    ADD COLUMN IF NOT EXISTS source VARCHAR;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'property_task'
  AND column_name = 'source';
