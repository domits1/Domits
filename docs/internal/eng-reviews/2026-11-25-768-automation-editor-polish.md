# fix(automation): insert variables at the cursor in the message editor (#768)

Pull request: to be opened
Issue: #768
Reviewed commit: staged diff on fix/768-automation-editor-polish
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | AutomationsPage.jsx `selectAutomation` / `startNew` | The focus flag is reset when another automation is selected or a new one is started, but no test covered that path. | Fixed: added the test "appends again after switching to another automation". |
| P3 (5/10) | AutomationsPage.jsx message template | Hosts reported that the variable buttons react slowly after pasting text. Nothing heavy reruns when the template changes; the likely cause is the old append-to-end behaviour, which put the variable out of view in a long message. | Accepted: no separate fix. Checked again in the browser after this change. |

## Not in scope

- A lighter font weight for automation names in the list. Tried and reverted after a look in the browser; the names stay bold.
- Deleting an automation. It needs a backend route and an API Gateway method, so it gets its own pull request.
- Adding PATCH to the Lambda's CORS allow-methods. Saving works in the browser today; it goes with the backend change of the delete pull request.
