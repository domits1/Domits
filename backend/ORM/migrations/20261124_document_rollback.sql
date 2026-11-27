DROP INDEX IF EXISTS main.document_version_host_id_idx;

DROP INDEX IF EXISTS main.document_version_document_id_version_number_unique;

DROP TABLE IF EXISTS main.document_version;

DROP INDEX IF EXISTS main.document_host_id_expiration_date_idx;

DROP INDEX IF EXISTS main.document_host_id_category_idx;

DROP INDEX IF EXISTS main.document_host_id_idx;

DROP TABLE IF EXISTS main.document;

DROP INDEX IF EXISTS test.document_version_host_id_idx_test;

DROP INDEX IF EXISTS test.document_version_document_id_version_number_unique_test;

DROP TABLE IF EXISTS test.document_version;

DROP INDEX IF EXISTS test.document_host_id_expiration_date_idx_test;

DROP INDEX IF EXISTS test.document_host_id_category_idx_test;

DROP INDEX IF EXISTS test.document_host_id_idx_test;

DROP TABLE IF EXISTS test.document;
