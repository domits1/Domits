SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'main'
  AND table_name = 'property_task_checklist_item';

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.%property_task_checklist_item%'
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS main.property_task_checklist_item (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL,
    title VARCHAR NOT NULL,
    position INT NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT true,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    requires_evidence BOOLEAN NOT NULL DEFAULT false,
    evidence_key VARCHAR,
    owner_team_member_id UUID,
    checked_at BIGINT,
    checked_by VARCHAR,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS property_task_checklist_item_task_idx
ON main.property_task_checklist_item (task_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.property_task_checklist_item%'
ORDER BY update_time ASC;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'property_task_checklist_item'
ORDER BY column_name ASC;

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'main'
  AND t.relname = 'property_task_checklist_item'
ORDER BY c.relname ASC;

BEGIN;
INSERT INTO main.property_task_checklist_item (
    id, task_id, title, position, is_required, is_checked, requires_evidence,
    created_at, updated_at
) VALUES (
    'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002',
    'smoke-test-item', 0, true, false, false, 1790000000000, 1790000000000
);
SELECT id, task_id, title, is_required, is_checked
FROM main.property_task_checklist_item
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

SELECT count(*) AS should_be_zero
FROM main.property_task_checklist_item;

DROP INDEX IF EXISTS main.property_task_checklist_item_task_idx;

DROP TABLE IF EXISTS main.property_task_checklist_item;
