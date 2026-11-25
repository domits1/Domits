# feat(automation): editor fixes, list filter and deleting an automation (#768)

Pull request: to be opened
Issue: #768
Reviewed commits: b28505233 (insert at cursor), 47e3765e2 (list tabs and schedule line), staged diff (delete)
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

## Third commit: deleting an automation

`DELETE /automations/{id}` deletes the host's automation and, in the same DSQL transaction (with `withDsqlRetry`), cancels its SCHEDULED deliveries with the reason "Automation was deleted.". Sent, failed and cancelled deliveries stay as history. The page gets a Delete button with a confirmation. The Lambda's CORS allow-methods now include PATCH, which the editor already uses.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | schedulingService.js:105, :122 | A paid booking processed at the same moment can read the automation before the delete and create a SCHEDULED delivery after it. | Accepted: deliveryWorker.js:72-74 reloads the automation before sending and cancels the delivery when it is gone, and `authorizeSend` requires the automation row to be ACTIVE. Nothing is sent. |
| P3 (6/10) | AutomationsPage.jsx `removeAutomation` | Deleting disables Save and Delete, but not Activate or Pause. | Accepted: both fail with 404 after the delete and show the error. |
| Release step | API Gateway UnifiedMessaging (54s3llwby8) | `/automations/{id}` has no DELETE method yet, so the browser call fails until it exists. | Add DELETE with `DomitsCognitoAuthorizer` and Lambda proxy integration to AutomatedMessaging, then deploy to `default`. Listed in the pull request. |

## Not in scope

- A lighter font weight for automation names in the list. Tried and reverted after a look in the browser; the names stay bold, like the inbox.
- A search box in the automation list. Hosts have only a few automations.
- Showing the delivery history of a deleted automation. The rows stay in the database for support, but the page has no place for them.
