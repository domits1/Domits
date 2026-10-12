SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'main'
  AND table_name = 'channex_ari_outbox';

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.%channex_ari_outbox%'
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS main.channex_ari_outbox (
    id VARCHAR(255) PRIMARY KEY,
    domitspropertyid VARCHAR(255) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    changetypes VARCHAR(100) NOT NULL,
    datefrom INTEGER NOT NULL,
    dateto INTEGER NOT NULL,
    source VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attemptcount INTEGER NOT NULL DEFAULT 0,
    nextattemptat BIGINT,
    failurereason TEXT,
    sentsummary TEXT,
    createdat BIGINT NOT NULL,
    updatedat BIGINT NOT NULL,
    processedat BIGINT
);

CREATE INDEX ASYNC IF NOT EXISTS idx_channex_ari_outbox_ready
ON main.channex_ari_outbox (status, domitspropertyid, createdat);

CREATE INDEX ASYNC IF NOT EXISTS idx_channex_ari_outbox_stale
ON main.channex_ari_outbox (status, updatedat);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.idx_channex_ari_outbox%'
ORDER BY update_time ASC;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'channex_ari_outbox'
ORDER BY column_name ASC;

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'main'
  AND t.relname = 'channex_ari_outbox'
ORDER BY c.relname ASC;

BEGIN;
INSERT INTO main.channex_ari_outbox (
    id, domitspropertyid, kind, changetypes, datefrom, dateto, source,
    status, attemptcount, createdat, updatedat
) VALUES (
    'smoke-test-row', 'smoke-test-property', 'CHANGE', 'availability', 20261101, 20261105,
    'CALENDAR', 'PENDING', 0, 1790000000000, 1790000000000
);
SELECT id, domitspropertyid, status, datefrom, dateto
FROM main.channex_ari_outbox
WHERE id = 'smoke-test-row';
ROLLBACK;

SELECT count(*) AS should_be_zero
FROM main.channex_ari_outbox;

DROP INDEX IF EXISTS main.idx_channex_ari_outbox_stale;

DROP INDEX IF EXISTS main.idx_channex_ari_outbox_ready;

DROP TABLE IF EXISTS main.channex_ari_outbox;
