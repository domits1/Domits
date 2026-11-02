# #3520 fix(tasks): only link, accept and remove the files of the caller's own task

Pull request: #3751
Issue: #3520
Reviewed commit: 3ce8b8fc6, and in round 2 the co-host tasks view fix on top of 9277fe8f0
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | backend/functions/property-tasks/business/service/taskService.js:226 | A delete removes the files before the task is marked deleted. If that write fails, the task stays with missing files | Accepted. #3749 and #3724 change these lines, and the bucket keeps earlier versions |
| P2 (8/10) | taskService.js:132 | Each save sends the whole list, so two saves at once can remove a file the other one just added | Accepted. Follow-up: send the list the form started from and answer 409 when it changed |
| P2 (6/10) | taskService.js:244 | The browser has to send exactly the signed type and size. Checked against the real signer in a test, not against the bucket from a browser | Try one upload on acceptance after the deploy |
| P3 (8/10) | taskService.js:254, taskAttachments.js:32 | A browser on the old bundle sends no task id or size and is refused until it reloads | Accepted |
| P3 (9/10) | frontend/web/src/features/hostdashboard/hosttasks/pages/HostTasks.js:285 | When one of several files is refused, the files already uploaded stay in storage unused | Accepted |
| P3 (8/10) | taskService.js:135 | Through the API, the same file can be put on two tasks of one host, and taking it off one removes it for the other | Accepted. The web never does this, since every upload gets a new name |
| P3 (7/10) | taskService.js:164 | The activity log is written after the files are removed. If it fails, the request answers an error although the task and its files changed | Accepted, existing order of the log. The attachments page says so |
| P3 (5/10) | backend/functions/property-tasks/business/service/pomService.js:27 | A team member of two hosts may have the upload and the save resolve different hosts, and gets a 400 | Accepted, existing behaviour |
| P2 (9/10) | frontend/web/src/features/hostdashboard/services/taskService.js:110 | Round 2: in the co-host tasks view the upload link was issued for the user's own folder, and create and update went to the user's own host | Fixed: upload, create and update send `asHostId`. Not covered by a page test: create and the status checkbox, for lack of room under 1000 lines |
| P4 (6/10) | frontend/web/src/features/hostdashboard/hosttasks/components/AttachmentThumb.js:31 | An unavailable thumbnail has no retry; reopening the task asks again | Accepted |

## Not in scope

- The storage calls stay in the business layer, where they already were.
- The view link keeps its 1 hour.
- In the co-host tasks view, delete, escalate, the checklist calls and the team member list still send no `asHostId`. Checklist items added while creating a task there are not saved, and the page names them.
- Files uploaded before this change keep the type they were uploaded with.
