SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'currency'
ORDER BY table_schema ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

SELECT table_schema, column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'currency'
ORDER BY table_schema ASC;

SELECT currency FROM test.booking LIMIT 1;

SELECT currency FROM main.booking LIMIT 1;
