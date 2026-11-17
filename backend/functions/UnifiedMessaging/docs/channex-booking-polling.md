# Channex Booking Polling

## Purpose

Bookings reach Domits through the Channex booking webhook (#3281). Polling is the backup (#3576): a scheduled run reads the unacknowledged booking feed of every mapped property and imports what the webhook missed, for example when the webhook was inactive, its secret did not match, or the route was down longer than Channex retries. Normally a poll finds nothing, because the webhook already acknowledged everything.

## How it works

- Every `CONNECTED` Channex account and every `ACTIVE` property mapping is polled, one property at a time.
- Each property reads the Channex booking revision feed with the host's own API key, imports mapped bookings, and acknowledges a revision only after it is stored.
- Polling and the webhook share one lock per property (`integration_sync_state`, sync type `booking_poll:<domits property id>`), so they never pull the same property at once. A webhook that arrives during a poll answers `503`, and Channex retries it.
- When a poll acknowledges a revision, it logs one line, because the webhook should have delivered it:

  ```json
  {"event":"CHANNEX_BOOKING_POLL_IMPORTED_MISSED","integrationAccountId":"...","domitsPropertyId":"...","ackedCount":1}
  ```

Out of scope: polling per account instead of per property (worth it once many hosts are connected), multi-room bookings.

## Schedule

The deploy workflow only updates Lambda code, so the schedule is set up by hand in EventBridge.

| Setting | Value |
|---|---|
| Rule name | `domits-channex-booking-poll` |
| Schedule | `rate(15 minutes)` |
| Target | `ChannelManagement` Lambda (the webhook, logs and alarms are there) |
| Target input | see below |

```json
{
  "source": "domits.channex.booking-poll",
  "action": "CHANNEX_BOOKING_POLL",
  "enabled": true,
  "trigger": "EVENTBRIDGE_POLL"
}
```

`enabled: true` in the event does not override the environment switch below.

## Environment variables

On the Lambda the rule targets:

| Variable | Value | Purpose |
|---|---|---|
| `CHANNEX_BOOKING_POLL_ENABLED` | `true` | Kill switch; anything else makes a poll return without calling Channex |
| `CHANNEX_BOOKING_POLL_ACCOUNT_IDS` | empty | Optional comma-separated `channel_integration_account.id` list. Empty means every connected account |
| `CHANNEX_BOOKING_POLL_DOMITS_PROPERTY_IDS` | empty | Optional comma-separated Domits property id list. Empty means every active mapping |
| `CHANNEX_BOOKING_POLL_LOCK_STALE_MS` | optional, default `300000` | After this time a `RUNNING` lock counts as stale |

Set polling up on one Lambda only, so two schedules never poll the same feed.

## Alarm on missed webhooks

A metric filter on `/aws/lambda/ChannelManagement` with the text pattern `"CHANNEX_BOOKING_POLL_IMPORTED_MISSED"` and an alarm (Sum ≥ 1 in 15 minutes, to the `channex-alerts` topic) emails when a poll had to import a booking. Then check why the webhook missed it: Channex → Webhooks, and the `channex-webhook-*` alarms.

## Manual test

Invoke the target Lambda with `backend/functions/UnifiedMessaging/events/channex-booking-poll.event.json`. Expected response: `action` `poll-latest-bookings`, `syncType` `booking_poll`, `accountsChecked` and `propertiesChecked` for the connected accounts, and normally `ackedCount` 0. Evidence rows and `integration_sync_log` rows are written with sync type `booking_poll`.

## Disable

1. Disable the EventBridge rule.
2. Set `CHANNEX_BOOKING_POLL_ENABLED=false`.

If a poll appears stuck, inspect `integration_sync_state` rows whose sync type starts with `booking_poll:`; a `RUNNING` row older than the stale threshold is taken over by the next run.
