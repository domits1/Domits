-- Roll the code back first (revert the model commit and let it deploy), then run this. The entity selects
-- currency on every booking read, so dropping it while that code runs breaks every booking read.
-- Dropping also loses the stored currencies. An unused nullable column is harmless to leave.
ALTER TABLE main.booking DROP COLUMN IF EXISTS currency;

ALTER TABLE test.booking DROP COLUMN IF EXISTS currency;
