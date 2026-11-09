# Channex health dashboard: design note

| | |
|---|---|
| Issue | #2869 (capability #440), first slice: internal admin health view |
| Related | #3620 alarms, #3278 ARI outbox, #3281 booking webhook, #3576 booking polling, #3572 rejected keys |
| Author | Enes Veli Yigit |
| Status | Design, not built |
| Date | 9 November 2026 |

## 1. Summary

A "Health" section at the top of the internal Channex diagnostics page shows, in one view, whether the channel manager is working: the overall status, the outbox backlog and failures, the last booking received, the last polling run, the seven CloudWatch alarms and the state of each connected Channex account.

One new read-only endpoint, `GET /integrations/channex/health`, collects this from the database and from CloudWatch. Nothing is written, and the alerting itself does not change: the alarms keep emailing through SNS `channex-alerts`.

```
Admin page (Health section)
        │ GET /integrations/channex/health   (Cognito + Channex admin allowlist, else 403)
        ▼
ChannelManagement Lambda ── channexHealthService
        ├──▶ DSQL (read-only): channex_ari_outbox, channex_booking_revision,
        │                      integration_sync_state, channel_integration_account,
        │                      channel_integration_property
        └──▶ CloudWatch DescribeAlarms (7 fixed names)   ── fails ──▶ alarms.available = false
        ▼
status (Healthy / Degraded / Down) + reasons + numbers
```

## 2. Problem

Today the health of the integration can only be checked in three places: the AWS console for the alarms, SQL on `main.channex_ari_outbox` for the backlog and failures, and the diagnostics page for one property at a time. An alarm email says something went wrong, but not how bad it is or whether it has already recovered. Before the first real host connects, an admin needs to see the state in one place within seconds.

## 3. Goals and non-goals

Goals (start document P9: "shows failed pushes, queue backlog and webhook status"):

- One status: Healthy, Degraded or Down, with the reason.
- Outbox: changes waiting, age of the oldest, changes failed and sent in the last 7 days, the last 10 failures with their reason.
- Bookings: when the last booking revision arrived, when polling last ran and whether that run succeeded.
- Alarms: the current state of the seven alarms from #3620.
- Accounts: status and last error of every Channex account, and how many properties each has mapped.

Non-goals for this slice (they stay in #2869):

- A host-facing view: bookings, revenue and errors per channel for the host's own properties.
- Booking performance, conversion and trends.
- SMS, in-app or webhook alerts; root-cause suggestions; exportable reports.
- Auto-refresh. The page loads once and refreshes on click.

## 4. What already exists and is reused

| Need | Existing code |
|---|---|
| Admin-only access | `protectedChannexCertificationAdminRoutes` and `isChannexCertificationUserAllowed` in `channelManagementHandler.js`; `checkChannexCertificationAccess` on the page |
| Admin page | `ChannexCertificationAdminPage.jsx` (route already protected) |
| Outbox rows | `ChannexAriOutboxRepository` (`channexAriOutboxRepository.js`) |
| Booking revisions | `ChannexBookingRevisionRepository` |
| Poll state | `integration_sync_state`, syncType `booking_poll:<propertyId>`, written by `channexBookingPollingService.js` through `IntegrationSyncRepository` |
| Accounts | `IntegrationAccountRepository.listByChannel` |
| Mapped properties | `channel_integration_property` |
| Alarms | five alarms in `channex_production_switch_runbook.md`, section Alarms, plus `channex-webhook-missed` (#3576) and `channex-reconnect-required` (#3572), which the runbook does not list yet |

New: one service, one repository method per table, one CloudWatch reader, one frontend component.

## 5. Decisions

**D1. Internal admins only.** The view shows all accounts, so it sits behind the existing Channex admin allowlist. A host view needs per-host filtering and plain-language errors and is a separate slice.

**D2. On the existing diagnostics page, as its own component.** It is rendered above `ChannexDiagnosticsPanel`, not inside it, because the panel is already over 2,000 lines.

**D3. Database plus live alarm states.** The database gives the numbers; CloudWatch gives the alarm states, which the database cannot know (Lambda errors and throttles, missed webhooks). Rejected: database only, because then the page could say Healthy while an alarm is firing.

**D4. CloudWatch failure does not break the page.** The database part and the alarm part are read in parallel. If CloudWatch fails, the response says `alarms: { available: false, reason }` and the rest is shown. The failure is logged as one JSON line, not swallowed.

**D5. Health rule.**

The first row that matches wins.

| Status | When |
|---|---|
| Down | A critical alarm is in ALARM |
| Degraded | A warning alarm is in ALARM, or a failed outbox change in the last 7 days, or the oldest waiting change is older than 7 minutes, or an account is `RECONNECT_REQUIRED`, or the last polling run ended `FAILED`, or the alarms could not be read |
| Healthy | None of the above |

Alarms are split by what they mean, so a probe on the webhook URL does not turn the page to Down:

| Alarm | Severity | Why |
|---|---|---|
| `channex-outbox-rows-failed` | Critical | A change will never reach Channex |
| `channex-webhook-errors` | Critical | Deliveries are failing; Channex stops retrying after about 24 hours |
| `channex-webhook-missed` | Critical | Bookings only arrive through polling |
| `channex-reconnect-required` | Critical | An account no longer syncs at all |
| `channelmanagement-errors` | Critical | The Lambda is throwing errors |
| `channex-webhook-rejected` | Warning | Usually probes from elsewhere; after a secret rotation, check the header |
| `channelmanagement-throttles` | Warning | A throttled webhook gets a 5xx, which Channex retries |

7 minutes because the worker may hold a change for up to 5 minutes while a host keeps saving (`CAP_MS`), and runs once a minute. The threshold is computed as `CAP_MS` plus two worker runs, not typed as a number, so it follows the cap if that changes. A change still waiting after that is stuck, or in back-off because Channex answered 429 or 5xx; both are worth a look. The banner shows each reason that applies.

**D6. Missed webhooks come from the alarm.** Polling logs `CHANNEX_BOOKING_POLL_IMPORTED_MISSED` but does not store a count. The `channex-webhook-missed` alarm state is enough for this slice; a stored count is a follow-up if the alarm ever fires.

**D7. Read-only, bounded queries.** Every query is a `SELECT` with a filter or `LIMIT`, so it takes no lock and cannot cause an optimistic-concurrency conflict with the worker.

## 6. Response

```json
{
  "generatedAt": 1794300000000,
  "status": "HEALTHY",
  "reasons": [],
  "outbox": {
    "pending": 2,
    "processing": 0,
    "oldestPendingCreatedAt": 1794299960000,
    "failedLast7Days": 0,
    "processedLast7Days": 31,
    "recentFailures": [
      { "id": "…", "domitsPropertyId": "…", "dateFrom": 20261110, "dateTo": 20261112, "failureReason": "…", "updatedAt": 1794200000000 }
    ]
  },
  "bookings": { "lastRevisionAt": 1794100000000, "lastPollAt": 1794299640000, "lastPollStatus": "SUCCESS" },
  "alarms": {
    "available": true,
    "items": [{ "name": "channex-outbox-rows-failed", "state": "OK", "updatedAt": 1793000000000 }]
  },
  "accounts": [
    { "id": "…", "displayName": "…", "status": "CONNECTED", "lastErrorCode": null, "mappedProperties": 1 }
  ]
}
```

No guest data, no credentials, no raw provider payloads. Account ids and property ids are internal ids that the diagnostics page already shows.

## 7. Queries

All on `main`. Outbox columns are lowercase without separators.

| Field | Query |
|---|---|
| pending, processing | `SELECT status, count(*) FROM channex_ari_outbox WHERE status IN ('PENDING','PROCESSING') GROUP BY status` |
| oldestPendingCreatedAt | `SELECT min(createdat) FROM channex_ari_outbox WHERE status = 'PENDING'` |
| failed / processed, 7 days | `SELECT status, count(*) FROM channex_ari_outbox WHERE status IN ('FAILED','PROCESSED') AND updatedat >= $1 GROUP BY status` |
| recentFailures | `… WHERE status = 'FAILED' ORDER BY updatedat DESC LIMIT 10` |
| lastRevisionAt | `SELECT max(createdAt) FROM channex_booking_revision` |
| lastPollAt, lastPollStatus | `SELECT lastSyncedAt, status FROM integration_sync_state WHERE syncType LIKE 'booking_poll:%' ORDER BY lastSyncedAt DESC LIMIT 1` |
| accounts | `IntegrationAccountRepository.listByChannel('CHANNEX')`, plus a count per account from `channel_integration_property` |

`lastSyncedAt` is set when a run takes the lock, before it finishes (`integrationSyncRepository.js`, `tryAcquireLock`), so it is the start of the last attempt. `status` says how that run ended: `SUCCESS`, `PARTIAL` or `FAILED`, or `RUNNING` while it is still going. The card shows both, for example "6 min ago · failed".

The 7-day counts stay correct because cleanup deletes PROCESSED rows after 30 days and FAILED rows after 90 days.

## 8. Platform limits

- **Lambda:** ChannelManagement has reserved concurrency 5, shared with the booking webhook and the outbox worker. One page load is one invocation with a few short queries and one CloudWatch call. No auto-refresh, so the page cannot crowd out the webhook.
- **CloudWatch:** one `DescribeAlarms` call with the seven alarm names (the API accepts up to 100). The names are fixed in code, so the endpoint cannot be used to read other alarms.
- **DSQL:** read-only, no transaction needed (D7).

## 9. Infrastructure prerequisites (done by hand)

1. IAM: allow `cloudwatch:DescribeAlarms` on the ChannelManagement Lambda role.
2. Dependency: `@aws-sdk/client-cloudwatch` in `backend/package.json`.
3. API Gateway: resource `/integrations/channex/health`, method GET with the Cognito authorizer, CORS, and a deployment of the stage.

## 10. Testing

Backend:
- Health rule: a table test with one row per condition in D5.
- Each repository query: SQL shape, filter or `LIMIT`, and the returned mapping.
- CloudWatch failure: the database part is returned and `alarms.available` is false.
- Access: a user not on the allowlist gets 403.

Frontend:
- Renders banner, cards, alarms and accounts from a fixture.
- Error state with a retry button.
- "Alarms unavailable" while the database part is shown.

## 11. Follow-ups

- Host-facing view and booking performance per channel (rest of #2869).
- Stored count of missed webhooks, if the alarm fires (D6).
- The date filter in the diagnostics panel scrolls with the page; it should stay in place.
- The runbook's Alarms table and this folder's README still describe five alarms; add `channex-webhook-missed` and `channex-reconnect-required`.
