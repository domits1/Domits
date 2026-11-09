# docs(channelmanagement): design note for the Channex health dashboard

Pull request: #<number>
Issue: #2869
Reviewed commit: staged diff on `docs/2869-health-dashboard-design`, before the first commit
Result: no blocking findings; 3 design findings, all applied in the note

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | `channex_health_dashboard_design.md`, D5 | "Any alarm in ALARM → Down" would show Down for `channex-webhook-rejected`, which the runbook says is usually probing and can be ignored, and for throttles, which Channex retries. | Fixed: alarms split into critical (Down) and warning (Degraded), with a table per alarm. |
| P2 (8/10) | `channex_health_dashboard_design.md`, D5 | A 5-minute threshold for the oldest waiting change equals the worker's own `CAP_MS` (`channexAriOutboxConstants.js:42`), so a busy host would show Degraded while everything works. | Fixed: threshold is `CAP_MS` plus two worker runs (7 minutes), computed from the constant. |
| P3 (6/10) | `channex_health_dashboard_design.md`, section 7 | `lastSyncedAt` is set when the poll lock is taken (`integrationSyncRepository.js:64-66`), so "last poll" alone does not say the poll worked. | Fixed: the card also shows the run's `status`; a `FAILED` last run counts as Degraded. |
| Dropped | `channex_health_dashboard_design.md`, section 7 | Raw SQL uses unquoted camelCase column names. | False positive: the existing poll lock query uses the same unquoted names (`integrationSyncRepository.js:69`) and runs in production. |

## Not in scope

- Host-facing view, booking performance per channel, SMS and in-app alerts, root-cause suggestions and reports: the rest of #2869.
- A stored count of missed webhooks: the `channex-webhook-missed` alarm state is used instead (D6).
- The runbook and the Channex README still describe five alarms instead of seven: listed as a follow-up in the note.
