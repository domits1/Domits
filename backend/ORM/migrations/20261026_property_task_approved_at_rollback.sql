-- Roll the code back first (revert the approve and reject commits and let it deploy), then run this. The
-- entity selects the column, so dropping it while the new code is running breaks every task read.
-- Dropping it also forgets which tasks were approved. Unverified: whether Aurora DSQL allows DROP COLUMN;
-- an unused nullable column is harmless to leave.
ALTER TABLE main.property_task
    DROP COLUMN IF EXISTS approved_at;

ALTER TABLE test.property_task
    DROP COLUMN IF EXISTS approved_at;
