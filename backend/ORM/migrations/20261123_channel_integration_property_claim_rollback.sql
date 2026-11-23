DROP INDEX IF EXISTS main.channel_integration_property_in_use_unique;

UPDATE main.channel_integration_property SET status = 'ACTIVE' WHERE id = '5f3fc6b0-da85-4ffb-b331-b74c24460099' AND status = 'ARCHIVED';
