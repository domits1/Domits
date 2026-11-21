SELECT tc.table_name, tc.constraint_name, cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON cc.constraint_schema = tc.constraint_schema
 AND cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'main'
  AND tc.table_name IN ('message_automation', 'booking_automation_outbox')
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name ASC, tc.constraint_name ASC;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'message_automation'
  AND column_name IN ('offsetdirection', 'sendtime')
ORDER BY column_name ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

ALTER TABLE main.message_automation ADD COLUMN IF NOT EXISTS offsetdirection VARCHAR(10);

ALTER TABLE main.message_automation ADD COLUMN IF NOT EXISTS sendtime VARCHAR(5);

ALTER TABLE main.message_automation ALTER COLUMN offsetdirection SET DEFAULT 'AFTER';

ALTER TABLE main.message_automation DROP CONSTRAINT IF EXISTS message_automation_triggertype_check;

ALTER TABLE main.message_automation
  ADD CONSTRAINT message_automation_triggertype_check
  CHECK (triggertype IN ('BOOKING_PAID', 'CHECK_IN', 'CHECK_OUT')) NOT VALID;

ALTER TABLE ASYNC main.message_automation VALIDATE CONSTRAINT message_automation_triggertype_check;

ALTER TABLE main.message_automation
  ADD CONSTRAINT message_automation_offsetdirection_check
  CHECK (offsetdirection IS NULL OR offsetdirection IN ('BEFORE', 'AFTER')) NOT VALID;

ALTER TABLE ASYNC main.message_automation VALIDATE CONSTRAINT message_automation_offsetdirection_check;

ALTER TABLE main.booking_automation_outbox DROP CONSTRAINT IF EXISTS booking_automation_outbox_eventtype_check;

ALTER TABLE main.booking_automation_outbox
  ADD CONSTRAINT booking_automation_outbox_eventtype_check
  CHECK (eventtype IN ('BOOKING_PAID', 'BOOKING_DATES_CHANGED')) NOT VALID;

ALTER TABLE ASYNC main.booking_automation_outbox VALIDATE CONSTRAINT booking_automation_outbox_eventtype_check;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'message_automation'
  AND column_name IN ('offsetdirection', 'sendtime')
ORDER BY column_name ASC;

SELECT tc.table_name, tc.constraint_name, cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON cc.constraint_schema = tc.constraint_schema
 AND cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'main'
  AND tc.table_name IN ('message_automation', 'booking_automation_outbox')
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name ASC, tc.constraint_name ASC;
