DROP TABLE IF EXISTS test.host_notification_preferences;
DROP TABLE IF EXISTS main.host_notification_preferences;

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'host_notification_preferences';
