DROP INDEX IF EXISTS main.property_owner_property_host_id_idx;

DROP INDEX IF EXISTS main.property_owner_property_property_id_idx;

DROP INDEX IF EXISTS main.property_owner_property_open_unique;

DROP INDEX IF EXISTS main.property_owner_property_owner_property_from_unique;

DROP TABLE IF EXISTS main.property_owner_property;

DROP INDEX IF EXISTS main.property_owner_host_id_idx;

DROP TABLE IF EXISTS main.property_owner;

DROP INDEX IF EXISTS test.property_owner_property_host_id_idx_test;

DROP INDEX IF EXISTS test.property_owner_property_property_id_idx_test;

DROP INDEX IF EXISTS test.property_owner_property_open_unique_test;

DROP INDEX IF EXISTS test.property_owner_property_owner_property_from_unique_test;

DROP TABLE IF EXISTS test.property_owner_property;

DROP INDEX IF EXISTS test.property_owner_host_id_idx_test;

DROP TABLE IF EXISTS test.property_owner;
