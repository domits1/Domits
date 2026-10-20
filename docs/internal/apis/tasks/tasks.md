# Tasks: notifications

Email notifications for the host dashboard Tasks module (issue #3510). This page covers notifications only, not the rest of the tasks API.

## What is sent today

| Event | Who is emailed | Setting that controls it | Sent when |
|---|---|---|---|
| Task assigned | The assignee (a team member) | The assignee's own `notif_email_assigned` | A task is created with an assignee, or an update changes the assignee to someone new |
| Task completed | The host | The host's own `notif_email_completed` | A **team member** moves a task to Completed. A host who completes their own task is not emailed |

Re-saving the same assignee, unassigning, completing an already completed task, and any other status change send nothing.

## Settings

- Stored in the `host_settings` table, written by the `host-settings` Lambda. There is one row per **logged-in user**, keyed by their Cognito username, so a team member has their own row.
- The email settings (assigned, overdue, completed) and the in-app setting default to **on**. The SMS setting defaults to **off**, and nothing reads it yet. A user with no saved row gets these defaults.
- Only **active** team members can be assigned a task and emailed. Someone whose invite is still pending (or who has left the team) cannot be assigned a task (the API answers 400) and gets no "Task assigned" email. The manual Escalate email looks the assignee up without checking this, so it is not covered.
- Users change them in **Tasks → Settings → Notifications**. "Task assigned to me" and "Task completed" are live. "Task overdue", "Urgent tasks only" (SMS) and "Enable notifications" (in-app) are disabled and tagged "Coming soon".
- The page blocks **Save** until the settings have loaded. A save sends every field, so saving over defaults that never loaded would overwrite a saved opt-out. If the load fails, an alert says so, and if a save fails, a message says so and the Save button stays available.

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

## Failure behaviour

- The task is already saved when the email is sent. A failed lookup or send is logged as `Failed to send task assigned notification for task <id>` (or `task completed`) and **never fails the task request**.
- There is no retry, no delivery record, and no message to the user when an email fails.
- The email calls are synchronous Lambda invokes with no timeout, so a slow email service slows the task request.

## Not built yet

- **Overdue emails** need a scheduler. Today the only overdue-related email is the manual Escalate button.
- SMS, push and in-app channels, quiet hours, reminders and digests, retries and a delivery log.

## Where the code is

| Layer | File |
|---|---|
| Controller | `backend/functions/property-tasks/controller/controller.js` (`updateTask`) |
| Business | `backend/functions/property-tasks/business/service/taskNotificationService.js`, `taskService.js` |
| Data | `backend/functions/property-tasks/data/taskRepository.js` (`getHostSettings`) |
| UI | `frontend/web/src/features/hostdashboard/hosttasks/components/SettingsView.js` |
| Tests | `backend/test/property-tasks/` (`taskNotificationService`, `taskService.assignment`, `taskService.completionNotification`, `controller.updateTask`) and `SettingsView.test.js` |
