# Channex Booking Polling

## Purpose

Domits can poll the Channex Booking Revision Feed so external Channex/OTA bookings are imported into Domits without requiring the Channex diagnostics panel to stay open.

This document prepares the EventBridge schedule for the backend polling logic in `UnifiedMessaging`. It does not deploy or enable AWS resources by itself.

## Current Scope

- Single-unit Domits listings only.
- Polls Channex booking revisions through the existing backend import flow.
- Imports mapped external bookings into Domits before acknowledgement.
- Acknowledges Channex revisions only after Domits booking/link persistence succeeds.
- Uses `integration_sync_state` as a best-effort app-level lock.

Out of scope:

- 20-30 second polling.
- Webhook receiving.
- Broad production polling.
- Multi-room booking support.
- Full distributed locking or database uniqueness migrations.

## Repo Deployment Pattern

The current repository deployment workflow updates Lambda function code from `.github/workflows/deploy.yml`. It does not own EventBridge rules, CloudWatch schedules, SAM, CDK, Terraform, or CloudFormation for this scheduler.

Because of that, Batch 4C uses documented AWS Console/EventBridge setup plus a local Lambda test event fixture.

## EventBridge Rule

Suggested rule name:

```text
domits-channex-booking-poll-rate-1-minute
```

Schedule expression:

```text
rate(1 minute)
```

Target:

```text
UnifiedMessaging Lambda
```

Target input:

```json
{
  "source": "domits.channex.booking-poll",
  "action": "CHANNEX_BOOKING_POLL",
  "enabled": true,
  "trigger": "EVENTBRIDGE_POLL"
}
```

The `enabled: true` event field tells the Lambda that this scheduled event allows polling. It does not override the Lambda environment kill switch. The service still requires `CHANNEX_BOOKING_POLL_ENABLED=true` and explicit staging allowlists before it will list accounts or call Channex.

## Required Environment Variables

Set these on the `UnifiedMessaging` Lambda before enabling the EventBridge rule:

```text
CHANNEX_BOOKING_POLL_ENABLED=true
CHANNEX_BOOKING_POLL_ACCOUNT_IDS=<staging channel_integration_account.id>
CHANNEX_BOOKING_POLL_DOMITS_PROPERTY_IDS=<staging Domits property id>
```

Optional:

```text
CHANNEX_BOOKING_POLL_LOCK_STALE_MS=300000
```

Safety behavior:

- If `CHANNEX_BOOKING_POLL_ENABLED` is false or missing, polling returns without calling Channex even when the event payload contains `enabled: true`.
- If account/property allowlists are missing or empty, polling returns without listing accounts or calling Channex.
- Unknown direct Lambda events do not match the polling branch and fall through to the normal handler behavior.

## Staging Enablement Steps

1. Confirm the Batch 4B/4C code is deployed to the staging `UnifiedMessaging` Lambda.
2. Add the required environment variables with the staging Channex account ID and staging Domits property ID.
3. Create an EventBridge scheduled rule with `rate(1 minute)`.
4. Set target to the staging `UnifiedMessaging` Lambda.
5. Use the target input JSON from this document.
6. Keep the rule disabled until a manual Lambda test event succeeds.
7. Enable the rule for a short controlled staging window.
8. Watch CloudWatch logs, `channex_sync_evidence`, and `integration_sync_log`.

## Manual Lambda Test Event

Use `backend/functions/UnifiedMessaging/events/channex-booking-poll.event.json` as the Lambda test event:

```json
{
  "source": "domits.channex.booking-poll",
  "action": "CHANNEX_BOOKING_POLL",
  "enabled": true,
  "trigger": "EVENTBRIDGE_POLL"
}
```

Expected result when allowlists are configured:

- `action` is `poll-latest-bookings`.
- `syncType` is `booking_poll`.
- `calledProvider` is true if at least one allowlisted active mapping is polled.
- Response includes fetched/raw-persisted/created/updated/cancelled/skipped/acked/unacked counts.
- Channex sync evidence rows are written with `syncType: booking_poll`.
- Integration sync log rows are written with `syncType: booking_poll` and `direction: IMPORT`.

Expected result when allowlists are missing:

- No Channex provider call is made.
- Response includes warning `CHANNEX_BOOKING_POLL_ALLOWLIST_REQUIRED`.

## Rollback / Disable Steps

Fastest disable options:

1. Disable the EventBridge rule.
2. Set `CHANNEX_BOOKING_POLL_ENABLED=false`.
3. Clear `CHANNEX_BOOKING_POLL_ACCOUNT_IDS` and `CHANNEX_BOOKING_POLL_DOMITS_PROPERTY_IDS`.

If a poll appears stuck, inspect `integration_sync_state` rows whose `syncType` starts with:

```text
booking_poll:
```

The backend treats old `RUNNING` rows as stale after the configured stale threshold.

## What Not To Claim

- Do not claim 20-30 second polling; the prepared cadence is one minute.
- Do not claim webhooks are implemented.
- Do not claim broad production polling is enabled or approved.
- Do not claim the app-level lock is full distributed locking.
- Do not claim multi-room bookings are supported.
