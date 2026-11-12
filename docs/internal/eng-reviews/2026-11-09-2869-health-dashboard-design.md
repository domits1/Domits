# docs(channelmanagement): design note for the Channex health dashboard

Pull request: #3819
Issue: #2869
Reviewed commit: staged diff on `docs/2869-health-dashboard-design`, before the first commit
Result: no blocking findings; 3 design findings from the eng-review and 3 from the PR review, all applied in the note

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | `channex_health_dashboard_design.md`, D5 | "Any alarm in ALARM → Down" would show Down for `channex-webhook-rejected`, which the runbook says is usually probing and can be ignored, and for throttles, which Channex retries. | Fixed: alarms split into critical (Down) and warning (Degraded), with a table per alarm. |
| P2 (8/10) | `channex_health_dashboard_design.md`, D5 | A 5-minute threshold for the oldest waiting change equals the worker's own `CAP_MS` (`channexAriOutboxConstants.js:42`), so a busy host would show Degraded while everything works. | Fixed: threshold is `CAP_MS` plus two worker runs (7 minutes), computed from the constant. |
| P3 (6/10) | `channex_health_dashboard_design.md`, section 7 | `lastSyncedAt` is set when the poll lock is taken (`integrationSyncRepository.js:64-66`), so "last poll" alone does not say the poll worked. | Fixed: the card also shows the run's `status`; a `FAILED` last run counts as Degraded. |
| P2 (9/10), missed by this review | `channex_health_dashboard_design.md`, section 7 | Raw SQL used unquoted camelCase columns. This review dropped it as a false positive based on `integrationSyncRepository.js:69`, but that query goes through TypeORM and proves nothing for raw SQL. Karim and elcoleta found in the PR review that `channex_booking_revision` has quoted columns (`004_add_channex_booking_revision.sql`, `"createdAt"`), so `max(createdAt)` would fail. | Fixed: section 7 quotes `"createdAt"`, and the tables without a create script are read through the TypeORM query builder on their entities. |
| P3 (7/10), from PR review | `channex_health_dashboard_design.md`, D5 | One FAILED outbox row kept the page Degraded for 7 days, and a FAILED row is never retried (Karim). | Fixed: the status uses the last 24 hours; the card keeps the 7-day count. |
| P3 (6/10), from PR review | `channex_health_dashboard_design.md`, D7 and section 8 | D7 claimed a filter or `LIMIT` on every query while `max()` has neither; reserved concurrency 5 is not in the repo (Karim). | Fixed: D7 names single aggregates; section 8 says the concurrency was set by hand on 7 October. |

## Not in scope

- Host-facing view, booking performance per channel, SMS and in-app alerts, root-cause suggestions and reports: the rest of #2869.
- A stored count of missed webhooks: the `channex-webhook-missed` alarm state is used instead (D6).
- The runbook and the Channex README still describe five alarms instead of seven: listed as a follow-up in the note.
