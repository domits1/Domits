-- Roll the code back first (revert the model commit and let it deploy), then run this. The entity selects
-- cancelled_at on every booking read, so dropping it while that code runs breaks every booking read.
-- Dropping also loses the stored cancel dates. An unused nullable column is harmless to leave.
ALTER TABLE main.booking DROP COLUMN IF EXISTS cancelled_at;

ALTER TABLE test.booking DROP COLUMN IF EXISTS cancelled_at;
