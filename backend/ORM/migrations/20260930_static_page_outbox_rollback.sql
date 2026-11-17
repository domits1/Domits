DROP INDEX IF EXISTS main.static_page_outbox_status_updated;

DROP TABLE IF EXISTS main.static_page_outbox;

ALTER TABLE IF EXISTS main.standalone_site
DROP COLUMN IF EXISTS static_page_revision;
