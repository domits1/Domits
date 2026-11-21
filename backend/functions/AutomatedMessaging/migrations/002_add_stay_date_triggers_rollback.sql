SELECT COUNT(*) AS automations_using_stay_dates
FROM main.message_automation
WHERE triggertype <> 'BOOKING_PAID'
   OR offsetdirection = 'BEFORE';

SELECT COUNT(*) AS outbox_events_of_other_types
FROM main.booking_automation_outbox
WHERE eventtype <> 'BOOKING_PAID';

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

ALTER TABLE main.booking_automation_outbox DROP CONSTRAINT IF EXISTS booking_automation_outbox_eventtype_check;

ALTER TABLE main.booking_automation_outbox
  ADD CONSTRAINT booking_automation_outbox_eventtype_check
  CHECK (eventtype = 'BOOKING_PAID') NOT VALID;

ALTER TABLE ASYNC main.booking_automation_outbox VALIDATE CONSTRAINT booking_automation_outbox_eventtype_check;

ALTER TABLE main.message_automation DROP CONSTRAINT IF EXISTS message_automation_triggertype_check;

ALTER TABLE main.message_automation
  ADD CONSTRAINT message_automation_triggertype_check
  CHECK (triggertype = 'BOOKING_PAID') NOT VALID;

ALTER TABLE ASYNC main.message_automation VALIDATE CONSTRAINT message_automation_triggertype_check;

ALTER TABLE main.message_automation DROP CONSTRAINT IF EXISTS message_automation_offsetdirection_check;

ALTER TABLE main.message_automation DROP COLUMN IF EXISTS sendtime;

ALTER TABLE main.message_automation DROP COLUMN IF EXISTS offsetdirection;
