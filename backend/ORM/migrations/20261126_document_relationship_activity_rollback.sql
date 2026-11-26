DROP INDEX IF EXISTS main.document_activity_host_id_idx;

DROP INDEX IF EXISTS main.document_activity_document_id_created_at_idx;

DROP TABLE IF EXISTS main.document_activity;

DROP INDEX IF EXISTS main.document_relationship_host_id_entity_idx;

DROP INDEX IF EXISTS main.document_relationship_document_entity_unique;

DROP TABLE IF EXISTS main.document_relationship;

DROP INDEX IF EXISTS test.document_activity_host_id_idx_test;

DROP INDEX IF EXISTS test.document_activity_document_id_created_at_idx_test;

DROP TABLE IF EXISTS test.document_activity;

DROP INDEX IF EXISTS test.document_relationship_host_id_entity_idx_test;

DROP INDEX IF EXISTS test.document_relationship_document_entity_unique_test;

DROP TABLE IF EXISTS test.document_relationship;
