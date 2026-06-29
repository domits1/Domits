# ChannelManagement Migration Deployment Runbook

## Safety Warnings

- Do not switch EventBridge in this migration batch.
- Do not add or move an EventBridge target to `ChannelManagement`.
- Do not enable `CHANNEX_BOOKING_POLL_ENABLED`; it must remain `false`.
- Do not switch root `ANY`, `{proxy+}`, or broad catch-all API Gateway routes.
- Do not remove `UnifiedMessaging` Channex/Holidu support until after the API Gateway switch has been smoke-tested and rollback is no longer required.

## Pre-Deploy Checks

- Confirm `ChannelManagement` exists in `eu-north-1` with handler `index.handler`.
- Confirm direct Lambda smoke tests still pass for:
  - `OPTIONS /integrations/channex/status`
  - `CHANNEX_BOOKING_POLL` returning `enabled=false` and `calledProvider=false`
- Confirm current API Gateway is REST API `54s3llwby8`, stage `default`.
- Confirm `CHANNEX_BOOKING_POLL_ENABLED=false`.
- Confirm no EventBridge changes are included in the deployment plan.

## IAM And Env Prerequisites

Set on both caller Lambdas:

```text
CHANNEL_MANAGEMENT_FUNCTION_NAME=ChannelManagement
UNIFIED_MESSAGING_FUNCTION_NAME=UnifiedMessaging
```

Required caller Lambdas:

- `General-Bookings-CRUD-Bookings-develop`
- `PropertyHandler`

Both caller Lambda execution roles must be allowed to invoke:

```text
arn:aws:lambda:eu-north-1:115462458880:function:ChannelManagement
```

Verify `ChannelManagement` has the same `CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN` expected by the callers. Do not print or expose token values.

## Deploy Order

1. Deploy the prepared code for the internal caller migration.
2. Add/verify `CHANNEL_MANAGEMENT_FUNCTION_NAME=ChannelManagement` and IAM invoke permission for both caller Lambdas.
3. Keep `UNIFIED_MESSAGING_FUNCTION_NAME=UnifiedMessaging` for rollback.
4. Smoke-test internal caller logs for successful invokes to `ChannelManagement`.
5. Manually switch only explicit API Gateway Channex/Holidu methods to `ChannelManagement`.
6. Deploy REST API stage `default`.
7. Run API smoke tests.
8. Watch CloudWatch logs.

## API Gateway Route Switch Rules

Move only these explicit methods to `ChannelManagement`.

Holidu:

```text
POST /integrations/holidu/connect
GET  /integrations/holidu/status
POST /integrations/holidu/disconnect
```

Channex:

```text
POST /integrations/channex/connect
GET  /integrations/channex/status
GET  /integrations/channex/admin-access
GET  /integrations/channex/properties
POST /integrations/channex/properties
GET  /integrations/channex/room-types
POST /integrations/channex/room-types
GET  /integrations/channex/rate-plans
POST /integrations/channex/rate-plans
GET  /integrations/channex/linked-room-types
GET  /integrations/channex/linked-rate-plans
GET  /integrations/channex/ari-targets
GET  /integrations/channex/ari-preview
GET  /integrations/channex/ari-payload-preview
GET  /integrations/channex/sync-evidence
GET  /integrations/channex/sync-evidence/latest
GET  /integrations/channex/sync-evidence/{id}
GET  /integrations/channex/bookings/revisions
POST /integrations/channex/setup/mapping
POST /integrations/channex/bookings/receive
POST /integrations/channex/bookings/pull
POST /integrations/channex/bookings/ack
POST /integrations/channex/sync/availability
POST /integrations/channex/sync/restrictions
POST /integrations/channex/sync/ari
POST /integrations/channex/sync/full
POST /integrations/channex/certification/test-case
POST /integrations/channex/certification/cancel-booking
POST /integrations/channex/disconnect
```

Internal-only routes are supported by `ChannelManagement` but should not be newly exposed. Move only if they already exist as explicit API Gateway methods:

```text
POST /integrations/channex/booking-availability/sync
POST /integrations/channex/calendar-change/sync
```

If only a broad proxy exists, create explicit Channex/Holidu resources/methods for `ChannelManagement` and leave the proxy on `UnifiedMessaging`.

## Routes That Must Stay On UnifiedMessaging

```text
POST /send
GET  /threads
GET  /messages
GET  /webhooks/whatsapp
POST /webhooks/whatsapp
all /integrations/whatsapp/... routes
/integrations/*/ingest/messages
GET  /integrations
POST /integrations
PATCH /integrations/{id}
GET  /integrations/{id}/logs
GET  /integrations/{id}/properties
POST /integrations/{id}/properties
POST /integrations/{id}/sync/messages
POST /integrations/{id}/sync/reservations
POST /integrations/{id}/reservations/link
```

## Post-Deploy Smoke Tests

Use:

```bash
BASE="https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default"
```

Run:

```bash
curl -i -X OPTIONS "$BASE/integrations/channex/status"
curl -i "$BASE/integrations/channex/admin-access?userId=<allowed-user>"
curl -i "$BASE/integrations/channex/status?userId=<allowed-user>"
curl -i "$BASE/integrations/holidu/status?userId=<user>"
curl -i -X POST "$BASE/integrations/channex/sync/full?userId=<allowed-user>&domitsPropertyId=<id>&dateFrom=2026-06-01&dateTo=2026-06-02&debugPing=true"
curl -i "$BASE/threads"
```

Expected:

- Channex/Holidu route traffic appears in `/aws/lambda/ChannelManagement`.
- `GET /threads` still appears in `/aws/lambda/UnifiedMessaging`.
- WhatsApp routes, if tested, still appear in `/aws/lambda/UnifiedMessaging`.
- Full sync `debugPing=true` returns `200` with the debug-ping body.

## CloudWatch Logs

Inspect:

```text
/aws/lambda/ChannelManagement
/aws/lambda/UnifiedMessaging
/aws/lambda/General-Bookings-CRUD-Bookings-develop
/aws/lambda/PropertyHandler
```

## Rollback

Internal callers:

- Remove `CHANNEL_MANAGEMENT_FUNCTION_NAME` from the two caller Lambdas, or set it to `UnifiedMessaging`.
- Keep `UNIFIED_MESSAGING_FUNCTION_NAME=UnifiedMessaging`.

API Gateway:

- Point the same explicit Channex/Holidu methods back to `UnifiedMessaging`.
- Deploy REST API stage `default`.
- Re-run smoke tests and confirm Channex/Holidu traffic returns to `/aws/lambda/UnifiedMessaging`.

EventBridge rollback is not applicable because EventBridge must not be changed in this batch.
