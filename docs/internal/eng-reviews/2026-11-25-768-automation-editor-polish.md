# fix(automation): insert variables at the cursor and filter the automation list like the inbox (#768)

Pull request: to be opened
Issue: #768
Reviewed commits: b28505233 (insert at cursor), staged diff (list tabs and schedule line)
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | AutomationsPage.jsx `selectAutomation` / `startNew` | The focus flag is reset when another automation is selected or a new one is started, but no test covered that path. | Fixed: added the test "appends again after switching to another automation". |
| P3 (5/10) | AutomationsPage.jsx message template | Hosts reported that the variable buttons react slowly after pasting text. Nothing heavy reruns when the template changes; the likely cause is the old append-to-end behaviour, which put the variable out of view in a long message. | Accepted: no separate fix. Checked again in the browser after this change. |

## Second commit: list tabs and schedule line

The automation list gets All / Active / Paused tabs in the same style as the inbox's All / Unread switch, and each automation shows when it is sent under its name, using the existing `describeSchedule`.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | AutomationsPage.jsx tab row | `aria-label` on a plain `div` is ignored by screen readers without a role. | Fixed: added `role="group"`. |
| P3 (6/10) | AutomationsPage.jsx `visibleAutomations` | On the Active or Paused tab, a newly saved draft or an automation whose status just changed leaves the list, while it stays open in the editor. | Accepted: this is what the filter means; the All tab shows everything, including drafts. |
| P3 (5/10) | automations.scss `.automation-list-tabs` | The tab styles repeat the inbox's `.contactlist-tabs`, which only apply inside `.messages-v2`. | Accepted: sharing them would mean moving inbox styles out of their scope; the copy is about 25 lines. |

## Not in scope

- A lighter font weight for automation names in the list. Tried and reverted after a look in the browser; the names stay bold, like the inbox.
- A search box in the automation list. Hosts have only a few automations.
- Deleting an automation. It needs a backend route and an API Gateway method, so it gets its own pull request.
- Adding PATCH to the Lambda's CORS allow-methods. Saving works in the browser today; it goes with the backend change of the delete pull request.
