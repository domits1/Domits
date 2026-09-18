SELECT site_id, COUNT(*) AS custom_rows
FROM main.standalone_site_domain
WHERE domain_type = 'CUSTOM'
GROUP BY site_id
HAVING COUNT(*) > 1;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.standalone_site_domain%';

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS standalone_site_domain_custom_site_unique ON main.standalone_site_domain (site_id) WHERE domain_type = 'CUSTOM';

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name = 'main.standalone_site_domain_custom_site_unique';

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid, pg_get_indexdef(i.indexrelid) AS index_definition
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

DROP INDEX IF EXISTS main.standalone_site_domain_custom_site_unique;
