SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'checked_out_at'
ORDER BY table_schema ASC;

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS checked_out_at BIGINT;

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS checked_out_at BIGINT;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'checked_out_at'
ORDER BY table_schema ASC;
