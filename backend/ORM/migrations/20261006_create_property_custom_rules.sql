SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name = 'property_custom_rules'
ORDER BY table_schema ASC;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%property_custom_rules%'
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS test.property_custom_rules (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    category VARCHAR NOT NULL,
    rule_text TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS property_custom_rules_property_id_idx_test
ON test.property_custom_rules (property_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.property_custom_rules%'
ORDER BY update_time ASC;

CREATE TABLE IF NOT EXISTS main.property_custom_rules (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    category VARCHAR NOT NULL,
    rule_text TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS property_custom_rules_property_id_idx
ON main.property_custom_rules (property_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.property_custom_rules%'
ORDER BY update_time ASC;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name = 'property_custom_rules'
ORDER BY table_schema ASC, column_name ASC;

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname = 'property_custom_rules'
ORDER BY n.nspname ASC, c.relname ASC;

BEGIN;
INSERT INTO test.property_custom_rules (id, property_id, category, rule_text, enabled, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002',
        'smoke-test', 'smoke-test rule', true, 1790000000000);
SELECT id, property_id, category, rule_text, enabled
FROM test.property_custom_rules
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

BEGIN;
INSERT INTO main.property_custom_rules (id, property_id, category, rule_text, enabled, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002',
        'smoke-test', 'smoke-test rule', true, 1790000000000);
SELECT id, property_id, category, rule_text, enabled
FROM main.property_custom_rules
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

SELECT 'test' AS schema_name, count(*) AS should_be_zero FROM test.property_custom_rules
UNION ALL
SELECT 'main' AS schema_name, count(*) AS should_be_zero FROM main.property_custom_rules;

DROP INDEX IF EXISTS main.property_custom_rules_property_id_idx;

DROP TABLE IF EXISTS main.property_custom_rules;

DROP INDEX IF EXISTS test.property_custom_rules_property_id_idx_test;

DROP TABLE IF EXISTS test.property_custom_rules;
