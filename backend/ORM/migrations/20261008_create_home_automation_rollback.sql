DROP INDEX IF EXISTS main.access_credential_provider_credential_unique;

DROP INDEX IF EXISTS main.access_credential_booking_device_unique;

DROP TABLE IF EXISTS main.access_credential;

DROP INDEX IF EXISTS main.home_automation_device_property_id_idx;

DROP INDEX IF EXISTS main.home_automation_device_provider_unique;

DROP TABLE IF EXISTS main.home_automation_device;

DROP INDEX IF EXISTS test.access_credential_provider_credential_unique_test;

DROP INDEX IF EXISTS test.access_credential_booking_device_unique_test;

DROP TABLE IF EXISTS test.access_credential;

DROP INDEX IF EXISTS test.home_automation_device_property_id_idx_test;

DROP INDEX IF EXISTS test.home_automation_device_provider_unique_test;

DROP TABLE IF EXISTS test.home_automation_device;
