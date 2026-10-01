SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'property_task'
  AND column_name IN ('assignee_team_member_id', 'parent_task_id')
ORDER BY column_name ASC;

ALTER TABLE main.property_task
    ADD COLUMN IF NOT EXISTS assignee_team_member_id UUID,
    ADD COLUMN IF NOT EXISTS parent_task_id UUID;

CREATE INDEX ASYNC property_task_assignee_idx ON main.property_task (assignee_team_member_id);

CREATE INDEX ASYNC property_task_parent_idx ON main.property_task (parent_task_id);

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'property_task'
  AND column_name IN ('assignee_team_member_id', 'parent_task_id')
ORDER BY column_name ASC;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name IN ('main.property_task_assignee_idx', 'main.property_task_parent_idx');
