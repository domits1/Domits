# Automated Messaging v1

`AutomatedMessaging` owns host automation definitions, booking-paid event processing, scheduling, rendering, and delivery state. It supports only `BOOKING_PAID` and `DOMITS_DIRECT`.

## Provisioning guard

Automatic validation and deployment are temporarily disabled by `.deployment-disabled` because the repository workflows only update Lambda functions that already exist in AWS. Do not run `npm run createLambda` for this existing directory: that command scaffolds template files before creating a Lambda and creates an unauthenticated root API method.

Remove `.deployment-disabled` only after the Lambda and the wiring below have been provisioned and verified. Subsequent changes will then use the normal AWS existence check and deployment workflow.

## Lambda configuration

- Function name: `AutomatedMessaging`
- Runtime: `nodejs22.x`
- Handler: `index.handler`
- Execution role: the existing `General-Lambda-Function` role, with the existing SSM, DSQL, and CloudWatch Logs permissions
- Environment: `UNIFIED_MESSAGING_LAMBDA_NAME=UnifiedMessaging` unless the deployed target has a different exact name
- Package: the function contents at the ZIP root, root `node_modules`, the ORM copied to `node_modules/database`, and `.shared`, matching `.github/workflows/deploy.yml`

The execution role must also allow `lambda:InvokeFunction` on the exact `UnifiedMessaging` function ARN. Do not grant wildcard Lambda invocation.

## API Gateway

Use Lambda proxy integrations for these routes. Apply the existing Cognito authorizer to every listed `GET`, `POST`, and `PATCH` method; only corresponding CORS `OPTIONS` methods remain unauthenticated.

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

Configure `REACT_APP_AUTOMATED_MESSAGING_API_URL` with the deployed API base URL. The frontend appends `/automations` itself.

## EventBridge

Create two schedules targeting `AutomatedMessaging`. Keep both disabled until the migrations have been applied and the health check succeeds.

- `AutomatedMessaging-ProcessBookingPaidOutbox`: `rate(1 minute)` with input `{ "action": "PROCESS_BOOKING_PAID_OUTBOX" }`
- `AutomatedMessaging-ProcessDueDeliveries`: `rate(1 minute)` with input `{ "action": "PROCESS_DUE_DELIVERIES" }`

Each rule needs a resource-based permission allowing only that EventBridge rule ARN to invoke `AutomatedMessaging`.

## Database deployment

1. Apply `../UnifiedMessaging/migrations/005_add_unified_thread_booking_id.sql` first when booking-scoped messaging is not already migrated.
2. Apply `migrations/001_create_automated_messaging_v1.sql`.
3. Call authenticated `GET /automations/health` as the deployment gate. It performs read-only schema validation and returns `503 SCHEMA_NOT_READY` when required columns or unique indexes are missing.
4. Enable the API and both EventBridge schedules only after the health check succeeds.

The Lambda never creates or alters database objects at runtime. Both SQL migrations remain explicit manual deployment steps.

No Email, SMS, WhatsApp, or OTA delivery is implemented by this function.
