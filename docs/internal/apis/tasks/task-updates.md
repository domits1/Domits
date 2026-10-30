# Tasks: updating a task

`PATCH ?id=<task id>` on the property-tasks API (`updateTask`, issue #2794). This page covers which fields an update may change and how it answers. The emails an update can send are in [tasks.md](tasks.md).

## Who may change what

Who the caller is, and for which host they act, comes from the signed-in user. Nothing in the request body decides it.

| Caller | How the API decides | Fields they may change |
|---|---|---|
| Host | The signed-in user acts on their own tasks: they do not send `asHostId`, and they either have a host role (Host, Admin, or General, Reservation, Guest Experience, Financial, Distribution, Revenue or Sales Manager) or no active team membership | `title`, `description`, `property_id`, `property_snapshot_label`, `type`, `status`, `priority`, `due_date`, `assignee_name`, `assignee_team_member_id`, `parent_task_id`, `attachments` |
| Team member | The signed-in user acts for a host: they send `asHostId` of a host they are an active team member of, or they have no host role (for example Property Operations Manager) and an active membership | The same fields |

There is no separate assignee role. An assignee who signs in is a team member of the host and may change the same fields as any other team member. The two lists are kept apart in `business/model/editableTaskFields.js`, so one can be narrowed without touching the other.

Every other column is set by the server: `id`, `host_id`, `completed_date`, `escalated_at`, `overdue_last_notified_at`, `overdue_notify_count`, `due_soon_notified_for`, `is_legacy`, `source`, `created_at` and `updated_at`. `DELETE` is the only way to set `is_legacy`, and `POST ?action=escalate` the only way to set `escalated_at`.

## What is checked before anything is saved

In this order. Each failure answers with the message shown, and nothing is saved and no attachment is removed.

| Check | Answer |
|---|---|
| The request has a task id | 400 `id is required` |
| Every field in the body is one the caller may change. One field outside the list rejects the whole update | 400 `These fields cannot be changed: <fields>` |
| The task belongs to the host the caller acts for | 404 `Task not found or access denied` |
| `status`, the Cancelled rule, `due_date` and `type` are valid | 400, as before |
| A changed `property_id` is a property of the same host. An unchanged one is not looked up again | 400 `property_id does not belong to this host` |
| `assignee_team_member_id` is an active team member and `parent_task_id` a task of the same host | 400, as before |

After these checks, attachments that were removed from the task are deleted from storage, the required checklist items are checked when the task is completed, and the task is saved.

## Two updates at the same time

- An update writes only the fields it sends. Two updates of different fields both stick. When both change the same field, the last write wins.
- Which fields a caller may change depends only on who they are, not on the state of the task, so a change made at the same moment cannot widen it. `host_id` cannot be changed, so the task found by the host check is the task that is written.
- When two people complete a task at once, only one write applies, and only that one is logged and emailed.
- A status change is checked against the status the request read. When another request changes the status in between, the later write wins.

## Where the code is

| Layer | File |
|---|---|
| Controller | `backend/functions/property-tasks/controller/controller.js` (`updateTask`, `deleteTask`) |
| Business | `backend/functions/property-tasks/business/model/editableTaskFields.js`, `business/service/taskService.js` (`updateTask`, `deleteTask`) |
| Data | `backend/functions/property-tasks/data/taskRepository.js` (`getTaskById`, `isPropertyOfHost`) |
| Tests | `backend/test/property-tasks/editableTaskFields.test.js`, `taskService.updateTask.editableFields.test.js`, `taskRepository.isPropertyOfHost.test.js` |
