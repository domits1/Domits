SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'standalone_site'
  AND column_name = 'published_site_properties_json';

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.standalone_site%'
  AND status IN ('submitted', 'processing');

ALTER TABLE IF EXISTS main.standalone_site
ADD COLUMN IF NOT EXISTS published_site_properties_json TEXT NULL;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'standalone_site'
  AND column_name = 'published_site_properties_json';

BEGIN;
SELECT id
FROM main.property
WHERE id = 'smoke-property' AND hostid = 'smoke-host' AND status = 'ACTIVE'
FOR UPDATE;
ROLLBACK;

SELECT COUNT(*) AS sites_with_property_snapshots
FROM main.standalone_site
WHERE published_site_properties_json IS NOT NULL;
