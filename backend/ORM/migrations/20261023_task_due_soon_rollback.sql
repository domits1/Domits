-- Roll the code back first (revert the due soon commits and let it deploy), then run this. The entities
-- select both columns, so dropping them while the new code is running breaks every task and settings read.
-- Dropping notif_email_due_soon also loses anyone's opt-out. Unverified: whether Aurora DSQL allows DROP COLUMN;
-- an unused nullable column is harmless to leave.
ALTER TABLE main.property_task
    DROP COLUMN IF EXISTS due_soon_notified_for;

ALTER TABLE main.host_settings
    DROP COLUMN IF EXISTS notif_email_due_soon;

ALTER TABLE test.property_task
    DROP COLUMN IF EXISTS due_soon_notified_for;
