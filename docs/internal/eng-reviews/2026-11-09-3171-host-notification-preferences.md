# feat(notifications): add host notification preference matrix (#3171)

Pull request: created from `mounir-host-notification-preferences`
Issue: #3171
Review basis: focused review of the proposed one-commit diff against `acceptance`
Result: no blocking findings identified in the UI and preference persistence slice. Automated tests have been added but were not run locally.

## Scope

The Host Dashboard communication preferences page now includes seven categories and 87 event-level checkboxes, based on the host-facing matrices in #3524, #3526, #3527, #3528, #3530, #3532 and the staff-task matrix in #3510.

The guest journey matrix in #3525 and the engineering/admin matrix in #3531 are excluded from the ordinary Host Dashboard settings page.

The existing reservation, cancellation and message delivery-channel preferences remain intact. Event-level host preferences use the authenticated user's `claims.sub` and a separate `main.host_notification_preferences` table.

## Findings and decisions

| Severity | Area | Finding | Decision |
|---|---|---|---|
| P1 | Notification delivery | The current work stores event-level preferences but does not wire every notification producer or delivery worker to enforce them. | Explicitly out of scope for this settings slice. README and PR description state that delivery enforcement is follow-up work; do not claim that disabling an option already suppresses all outbound notifications. |
| P2 | Database | The new table requires the `20261109_host_notification_preferences.js` migration to be applied through the approved database process. | Documented prerequisite. No runtime migration is added. |
| P2 | Matrix consistency | The frontend contains event display metadata and the backend validates the same event keys. Both configurations must stay aligned. | Added coverage for the event matrix and verified that both lists currently contain the same 87 keys. |
| P3 | Defaults | New hosts have no preference row. | All listed event options default to enabled; the first save creates the user's row. Product can revise defaults separately if required. |

## Validation

- Added frontend coverage for all seven category tabs, event toggling, loading failure and saving.
- Added API tests for the host-event GET/PUT view.
- Added backend service and controller tests for defaults, validation, persistence, timestamps and host-only access.
- Parsed and validated all four locale JSON files.
- Confirmed the frontend and backend event-key lists currently match (87 unique events).
- Tests were not run locally; CI must validate the branch.

## Not in scope

- Changing the actual notification event producers or delivery workers.
- Adding new delivery channels or changing which channel a given event uses.
- Guest notification preferences.
- Engineering or admin-only notification preferences.
- Applying the database migration to any environment.
