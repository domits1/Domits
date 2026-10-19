# Tasks: notifications

Email notifications for the host dashboard Tasks module (issue #3510). This page covers notifications only, not the rest of the tasks API.

## What is sent today

| Event | Who is emailed | Setting that controls it | Sent when |
|---|---|---|---|
| Task assigned | The assignee (a team member) | The assignee's own `notif_email_assigned` | A task is created with an assignee, or an update changes the assignee to someone new |
| Task completed | The host | The host's own `notif_email_completed` | A **team member** moves a task to Completed. A host who completes their own task is not emailed |
| Task overdue | The assignee, or the host when there is no assignee or the assignee has left the team | The recipient's own `notif_email_overdue` | A scheduled sweep finds an open task that went past its due date in the last 24 hours and was never emailed (the first email), or one that was last emailed 2 or more days ago and has had fewer than 4 overdue emails (a reminder) |

Re-saving the same assignee, unassigning, completing an already completed task, and any other status change send nothing. A task gets at most 4 overdue emails: the first one, then a reminder every 2 days, at most 3 reminders. Reminders stop when the task is completed or cancelled, and a task that was escalated by hand is skipped, so nobody gets both.

## Settings

- Stored in the `host_settings` table, written by the `host-settings` Lambda. There is one row per **logged-in user**, keyed by their Cognito username, so a team member has their own row.
- The email settings (assigned, overdue, completed) and the in-app setting default to **on**. The SMS setting defaults to **off**, and nothing reads it yet. A user with no saved row gets these defaults.
- An assignee who has not accepted their invite yet has no `member_user_id`, so there is no row to read and the default (on) applies.
- Users change them in **Tasks → Settings → Notifications**. "Task assigned to me", "Task completed" and "Task overdue" are live. "Urgent tasks only" (SMS) and "Enable notifications" (in-app) are disabled and tagged "Coming soon".
- The page blocks **Save** until the settings have loaded. A save sends every field, so saving over defaults that never loaded would overwrite a saved opt-out. If the load fails, an alert says so.

## How it works

```
createTask / updateTask (property-tasks)
        │  task is saved and the activity is logged first
        ▼
notifyTaskAssigned / notifyTaskCompleted     business/service/taskNotificationService.js
        │  read the recipient's host_settings row; opted out → stop
        ▼
EmailNotificationService (existing Lambda)   payload: { body: { toEmail, subject, body } }
```

- `updateTask(hostId, taskId, updateData, { actorIsTeamMember })` takes the option from the controller, which fills it from `isPOM` (derived server-side from the token and team membership, never from the request body).
- The completed email looks the host's address up through the `GetUserInfo` Lambda, as the escalation email does.

### The overdue sweep

```
EventBridge Scheduler  ── {"task":"notify-overdue-tasks","limit":20} ──▶ property-tasks (index.js)
        │  only events with no httpMethod; API Gateway requests are refused
        ▼
taskOverdueService.notifyOverdueTasks      business/service/taskOverdueService.js
        │  getOverdueTasksToNotify: open, past due, not escalated, not legacy, and either
        │     never emailed and due within the last 24 hours (first email), or
        │     last emailed 2+ days ago with fewer than 4 emails so far (reminder)
        │  for each task: claimOverdueNotification (UPDATE ... WHERE overdue_last_notified_at is still the value read)
        │     lost the claim → skip; won it → notifyTaskOverdue
        ▼
notifyTaskOverdue → recipient's notif_email_overdue → EmailNotificationService
```

- The claim comes **before** the email, so overlapping runs cannot send twice. The cost is that a failed email is not retried.
- `limit` defaults to 20 and is capped at 100.
- The **first** email goes only to tasks that went overdue in the last 24 hours. That stops the first run from emailing about every old unfinished task. The cost is that a task more than a day overdue when the sweep first sees it never gets a first email, so if the schedule is off or failing for over a day, those tasks are skipped. Reminders are not limited by this window.
- Reminders are sent every 2 days after the last email, up to 4 emails in total. The three numbers (`FIRST_EMAIL_WINDOW_MS`, `REMINDER_INTERVAL_MS`, `MAX_OVERDUE_EMAILS`) are constants in `taskRepository.js`. A reminder's subject starts with "Reminder, task still overdue".
- Tasks that were never emailed are picked before reminders, so a backlog of reminders cannot delay a first email.
- Reminders go to whoever is the assignee at that moment, so a reassigned task reminds the new assignee.
- The query covers every host. It is a system job, so there is no token: the caller needs `lambda:InvokeFunction` on the Lambda.

## Failure behaviour

- The task is already saved when the email is sent. A failed lookup or send is logged as `Failed to send task assigned notification for task <id>` (or `task completed`, `task overdue`) and **never fails the task request**.
- There is no retry, no delivery record, and no message to the user when an email fails. For overdue, the task is marked as emailed before the email goes out, so a failed overdue email is **not** retried straight away. It counts as one of the 4, and the next reminder comes 2 days later.
- The email calls are synchronous Lambda invokes with no timeout, so a slow email service slows the task request.

## Turning on the overdue sweep

The code is inert until these are done, in this order. They are manual AWS steps.

1. **Add the columns before the code is deployed.** `property_task.overdue_last_notified_at` and `property_task.overdue_notify_count` are in the entity, so every task query fails with "column does not exist" until they exist. Run `backend/ORM/migrations/20261019_property_task_overdue_notified.sql` as the `admin` user, `test` schema first, then `main`, one statement at a time. The rollback file drops the column again. Not verified: whether Aurora DSQL allows `DROP COLUMN`. An unused nullable column is harmless to leave.
2. In the `property-tasks` Lambda, raise the timeout (a sweep makes several sequential calls per task) and set asynchronous retries to 0.
3. Create the scheduler role and the schedule from `backend/infrastructure/task-overdue/`. The schedule file is created `DISABLED`.
4. After deployment, invoke the Lambda once by hand with `{"task":"notify-overdue-tasks","limit":1}` on an overdue test task and check the email and the column.
5. Enable the schedule.

## Not built yet

- SMS, push and in-app channels, quiet hours, daily digests, reminders for events other than overdue, retries and a delivery log.

## Where the code is

| Layer | File |
|---|---|
| Routing | `backend/functions/property-tasks/index.js` (the scheduled `notify-overdue-tasks` event) |
| Controller | `backend/functions/property-tasks/controller/controller.js` (`updateTask`, `runOverdueSweep`) |
| Business | `backend/functions/property-tasks/business/service/taskNotificationService.js`, `taskOverdueService.js`, `taskService.js` |
| Data | `backend/functions/property-tasks/data/taskRepository.js` (`getHostSettings`, `getOverdueTasksToNotify`, `claimOverdueNotification`) |
| Schema | `backend/ORM/models/Property_Task.js`, `backend/ORM/migrations/20261019_property_task_overdue_notified.*` |
| Schedule | `backend/infrastructure/task-overdue/` |
| UI | `frontend/web/src/features/hostdashboard/hosttasks/components/SettingsView.js` |
| Tests | `backend/test/property-tasks/` (`taskNotificationService`, `taskOverdueService`, `taskRepository.overdue`, `taskService.assignment`, `taskService.completionNotification`, `controller.updateTask`, `controller.runOverdueSweep`, `index`) and `SettingsView.test.js` |
