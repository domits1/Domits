# Automated Messaging v1

`AutomatedMessaging` owns host automation definitions, booking-paid event processing, scheduling, rendering, and delivery state. It supports only `BOOKING_PAID` and `DOMITS_DIRECT`.

## Deployment status

The `AutomatedMessaging` Lambda exists in AWS, so the repository's Lambda existence validation now passes. The deployment workflow updates function code only after a merge or push to `acceptance` or `main`; pushes to feature branches run validation but do not deploy Lambda code.

The AWS configuration and release gates below must still be completed and verified before enabling real users or scheduled processing.

## Lambda configuration

- Function name: `AutomatedMessaging`
- Runtime: `nodejs22.x`
- Handler: `index.handler`
- Execution role: the existing `General-Lambda-Function` role, with the existing SSM, DSQL, and CloudWatch Logs permissions
- Environment: `UNIFIED_MESSAGING_LAMBDA_NAME=UnifiedMessaging` unless the deployed target has a different exact name
- Package: the function contents at the ZIP root, root `node_modules`, the ORM copied to `node_modules/database`, and `.shared`, matching `.github/workflows/deploy.yml`

Verify that the execution role allows `lambda:InvokeFunction` on the exact `UnifiedMessaging` function ARN. Do not grant wildcard Lambda invocation.

## API Gateway

Use Lambda proxy integrations for these routes. Before enabling real users, apply the existing Cognito authorizer to every listed `GET`, `POST`, and `PATCH` method. Only corresponding CORS `OPTIONS` methods may remain unauthenticated.

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

Configure `REACT_APP_AUTOMATED_MESSAGING_API_URL` with the deployed API base URL. The frontend appends `/automations` itself.

## EventBridge

Create two schedules targeting `AutomatedMessaging`. Create them initially disabled and enable them only after the migrations have been applied and the authenticated health check succeeds.

- `AutomatedMessaging-ProcessBookingPaidOutbox`: `rate(1 minute)` with input `{ "action": "PROCESS_BOOKING_PAID_OUTBOX" }`
- `AutomatedMessaging-ProcessDueDeliveries`: `rate(1 minute)` with input `{ "action": "PROCESS_DUE_DELIVERIES" }`

Each rule needs a resource-based permission allowing only that EventBridge rule ARN to invoke `AutomatedMessaging`.

## Database deployment

1. Apply `../UnifiedMessaging/migrations/005_add_unified_thread_booking_id.sql` first when booking-scoped messaging is not already migrated.
2. Apply `migrations/001_create_automated_messaging_v1.sql`.
3. Call authenticated `GET /automations/health` as the deployment gate. It must return `200 {"ready":true}`. It performs read-only schema validation and returns `503 SCHEMA_NOT_READY` when required columns or unique indexes are missing.
4. Enable real users and both EventBridge schedules only after the health check succeeds.

The Lambda never creates or alters database objects at runtime. Both SQL migrations remain explicit manual deployment steps.

No Email, SMS, WhatsApp, or OTA delivery is implemented by this function.
