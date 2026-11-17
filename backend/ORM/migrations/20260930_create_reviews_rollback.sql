-- Intentionally preserves all review tables, indexes, and data.
-- IF NOT EXISTS cannot establish ownership of pre-existing objects.
-- See docs/internal/tools/dsql_reviews_runbook.md before reverting application code.
SELECT 1 AS review_rollback_preserves_data;
