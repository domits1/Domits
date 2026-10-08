SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'test'
  AND table_name = 'property_task'
  AND column_name = 'escalated_at';

ALTER TABLE test.property_task
    ADD COLUMN IF NOT EXISTS escalated_at BIGINT;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'test'
  AND table_name = 'property_task'
  AND column_name = 'escalated_at';
