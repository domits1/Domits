# #2794 fix(tasks): only let a task update change the fields its caller may change

Pull request: #3749
Issue: #2794
Reviewed commit: e1521e60d
Result: 1 blocking, all fixed

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | docs/internal/apis/tasks/task-updates.md:11 | The first draft said every manager role acts as the host. Property Operations Manager is not a host role in `pomService.js`, so that team member acts for the host | Fixed before commit e1521e60d |
| P2 (9/10) | backend/functions/property-tasks/business/service/taskService.js:79 (before this change) | #3723 drops `approved_at` from an update without a word and tests that. With this change, an update that sends `approved_at` gets a 400, and the two pull requests conflict on that one hunk | Accepted. The resolution is in the pull request description: keep neither `delete` line, and change that test to expect a 400 |
| P3 (8/10) | backend/functions/property-tasks/business/service/taskService.js:244 | The delete path into the shared update step had no test | Fixed in 256119c6f |
| P3 (8/10) | backend/functions/property-tasks/business/service/taskService.js:74 | An id that is present but not a UUID still reaches the database and answers 500 | Accepted. A UUID check would mean rewriting the `"task-1"` fixtures here and in open pull requests. Follow-up |
| P3 (9/10) | backend/functions/property-tasks/business/service/taskService.js:197, taskChecklistService.js:8 | Escalating, and the checklist endpoints, still answer 500 for a task outside the caller's host | Accepted. Those endpoints are outside this change |
| P4 (6/10) | backend/functions/property-tasks/business/model/editableTaskFields.js:32 | The 400 message repeats field names from the request body | Accepted. The body is JSON and the web shows the message as plain text |

## Not in scope

- Creating a task, the checklist endpoints and escalating are not changed by this pull request.
- Letting a team member change fewer fields than the host. That is a product decision, and the two lists in `editableTaskFields.js` are ready for it.
- A status change made from a stale read: the later write wins. Making that write depend on the status that was read is a separate change.
