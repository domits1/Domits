SELECT site_id, COUNT(*) AS custom_rows
FROM main.standalone_site_domain
WHERE domain_type = 'CUSTOM'
GROUP BY site_id
HAVING COUNT(*) > 1;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.standalone_site_domain%'
  AND status IN ('submitted', 'processing');

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS standalone_site_domain_custom_site_unique ON main.standalone_site_domain (site_id) WHERE domain_type = 'CUSTOM';

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name = 'main.standalone_site_domain_custom_site_unique';

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid, pg_get_expr(i.indpred, i.indrelid) AS predicate, array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE t.relname = 'standalone_site_domain'
  AND n.nspname = 'main'
  AND c.relname = 'standalone_site_domain_custom_site_unique';

BEGIN;

INSERT INTO main.standalone_site_domain
  (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
VALUES
  ('smoke-custom-1', 'smoke-site', 'www.smoke-one.example', 'CUSTOM', 'PENDING', FALSE, '{}', 1789000000000, 1789000000000, 1789000000000);

INSERT INTO main.standalone_site_domain
  (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
VALUES
  ('smoke-custom-2', 'smoke-site', 'www.smoke-two.example', 'CUSTOM', 'PENDING', FALSE, '{}', 1789000000000, 1789000000000, 1789000000000);

ROLLBACK;

BEGIN;

INSERT INTO main.standalone_site_domain
  (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
VALUES
  ('smoke-fallback-1', 'smoke-site', 'smoke-one.direct.domits.com', 'FALLBACK', 'ACTIVE', TRUE, '{}', 1789000000000, 1789000000000, 1789000000000);

INSERT INTO main.standalone_site_domain
  (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
VALUES
  ('smoke-custom-3', 'smoke-site', 'www.smoke-three.example', 'CUSTOM', 'PENDING', FALSE, '{}', 1789000000000, 1789000000000, 1789000000000);

SELECT id, site_id, domain_type
FROM main.standalone_site_domain
WHERE site_id = 'smoke-site'
ORDER BY id ASC;

ROLLBACK;

INSERT INTO main.standalone_site_domain (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
VALUES ('race-custom-a', 'race-site', 'www.race-a.example', 'CUSTOM', 'PENDING', FALSE, '{}', 1789000000000, 1789000000000, 1789000000000)
ON CONFLICT (domain)
DO UPDATE SET site_id = EXCLUDED.site_id, domain_type = EXCLUDED.domain_type, status = EXCLUDED.status, is_primary = EXCLUDED.is_primary, verification_details_json = EXCLUDED.verification_details_json, last_checked_at = EXCLUDED.last_checked_at, updated_at = EXCLUDED.updated_at
RETURNING id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at;

INSERT INTO main.standalone_site_domain (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
VALUES ('race-custom-b', 'race-site', 'www.race-b.example', 'CUSTOM', 'PENDING', FALSE, '{}', 1789000000000, 1789000000000, 1789000000000)
ON CONFLICT (domain)
DO UPDATE SET site_id = EXCLUDED.site_id, domain_type = EXCLUDED.domain_type, status = EXCLUDED.status, is_primary = EXCLUDED.is_primary, verification_details_json = EXCLUDED.verification_details_json, last_checked_at = EXCLUDED.last_checked_at, updated_at = EXCLUDED.updated_at
RETURNING id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at;

DELETE FROM main.standalone_site_domain
WHERE site_id = 'race-site';

BEGIN;

INSERT INTO main.standalone_site_domain (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
VALUES ('race-custom-c', 'race-site', 'www.race-c.example', 'CUSTOM', 'PENDING', FALSE, '{}', 1789000000000, 1789000000000, 1789000000000)
ON CONFLICT (domain)
DO UPDATE SET site_id = EXCLUDED.site_id, domain_type = EXCLUDED.domain_type, status = EXCLUDED.status, is_primary = EXCLUDED.is_primary, verification_details_json = EXCLUDED.verification_details_json, last_checked_at = EXCLUDED.last_checked_at, updated_at = EXCLUDED.updated_at
RETURNING id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at;

BEGIN;

INSERT INTO main.standalone_site_domain (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
VALUES ('race-custom-d', 'race-site', 'www.race-d.example', 'CUSTOM', 'PENDING', FALSE, '{}', 1789000000000, 1789000000000, 1789000000000)
ON CONFLICT (domain)
DO UPDATE SET site_id = EXCLUDED.site_id, domain_type = EXCLUDED.domain_type, status = EXCLUDED.status, is_primary = EXCLUDED.is_primary, verification_details_json = EXCLUDED.verification_details_json, last_checked_at = EXCLUDED.last_checked_at, updated_at = EXCLUDED.updated_at
RETURNING id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at;

COMMIT;

COMMIT;

SELECT id, site_id, domain
FROM main.standalone_site_domain
WHERE site_id = 'race-site'
ORDER BY id ASC;

DELETE FROM main.standalone_site_domain
WHERE site_id = 'race-site';

SELECT COUNT(*) AS race_rows_left
FROM main.standalone_site_domain
WHERE site_id = 'race-site';

DROP INDEX IF EXISTS main.standalone_site_domain_custom_site_unique;
