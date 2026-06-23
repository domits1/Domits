# Automated Messaging v1

`AutomatedMessaging` owns host automation definitions, booking-paid event processing, scheduling, rendering, and delivery state. It supports only `BOOKING_PAID` and `DOMITS_DIRECT`.

## Deployment status

The `AutomatedMessaging` Lambda exists in `eu-north-1`, so the repository's Lambda existence validation passes. Its API Gateway routes are configured under the existing `UnifiedMessaging` REST API and deployed to the `default` stage.

The deployment workflow updates function code only after a merge or push to `acceptance` or `main`; pushes to feature branches run validation but do not deploy Lambda code. The code on this branch must therefore be merged and deployed to `acceptance` before the automation feature is enabled.

## Lambda configuration

- Function name: `AutomatedMessaging`
- Runtime: `nodejs22.x`
- Handler: `index.handler`
- Execution role: the existing `General-Lambda-Function` role, with the existing SSM, DSQL, and CloudWatch Logs permissions
- Environment: `UNIFIED_MESSAGING_LAMBDA_NAME=UnifiedMessaging`
- Package: the function contents at the ZIP root, root `node_modules`, the ORM copied to `node_modules/database`, and `.shared`, matching `.github/workflows/deploy.yml`

The execution role has the Lambda invoke permission required for `AutomatedMessaging` to invoke `UnifiedMessaging` for Domits Direct delivery.

## API Gateway

The following Lambda proxy routes are configured. Every listed non-`OPTIONS` method uses `DomitsCognitoAuthorizer`; corresponding CORS `OPTIONS` methods remain unauthenticated.

- `GET /automations`
- `POST /automations`
- `POST /automations/preview`
- `GET /automations/health`
- `GET /automations/{id}`
- `PATCH /automations/{id}`
- `POST /automations/{id}/activate`
- `POST /automations/{id}/pause`
- `POST /automations/{id}/preview`
- `GET /automations/{id}/deliveries`

`POST /automations/preview` is required for previewing an automation before it has been saved and assigned an ID.

The frontend appends `/automations` to `REACT_APP_AUTOMATED_MESSAGING_API_URL`. Confirm that this variable contains the deployed API base URL in the frontend build environment before enabling real users.

## EventBridge

The following EventBridge schedules target `AutomatedMessaging` and are currently disabled:

- `AutomatedMessaging-ProcessBookingPaidOutbox`: `rate(1 minute)` with input `{ "action": "PROCESS_BOOKING_PAID_OUTBOX" }`
- `AutomatedMessaging-ProcessDueDeliveries`: `rate(1 minute)` with input `{ "action": "PROCESS_DUE_DELIVERIES" }`

Keep both schedules disabled until the acceptance deployment is complete and the authenticated health check succeeds.

## Database deployment

The following migrations have been applied successfully:

1. `../UnifiedMessaging/migrations/005_add_unified_thread_booking_id.sql`
2. `migrations/001_create_automated_messaging_v1.sql`

The required tables, columns, and all 11 required indexes are present. The Lambda never creates or alters database objects at runtime.

## Remaining enablement gates

1. Merge and deploy this branch to `acceptance` so the real `AutomatedMessaging` function code is installed.
2. Confirm `REACT_APP_AUTOMATED_MESSAGING_API_URL` in the frontend build environment.
3. Call authenticated `GET /automations/health` and require `200 {"ready":true}`. The endpoint returns `503 SCHEMA_NOT_READY` when required schema objects are unavailable.
4. Enable real users and both EventBridge schedules only after the health check succeeds.

No Email, SMS, WhatsApp, or OTA delivery is implemented by this function.
