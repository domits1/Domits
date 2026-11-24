-- Roll the application code back first. These fields are additive snapshots;
-- remove them only when a full schema rollback is required.
ALTER TABLE main.invoice DROP COLUMN IF EXISTS net_amount_minor;
ALTER TABLE main.invoice DROP COLUMN IF EXISTS commission_amount_minor;
ALTER TABLE main.invoice DROP COLUMN IF EXISTS gross_amount_minor;
ALTER TABLE main.invoice DROP COLUMN IF EXISTS rate_per_night_minor;
ALTER TABLE main.invoice DROP COLUMN IF EXISTS currency;
