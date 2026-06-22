# Automated Messaging v1

`AutomatedMessaging` owns host automation definitions, booking-paid event processing, scheduling, rendering, and delivery state. It supports only `BOOKING_PAID` and `DOMITS_DIRECT`.

## Required manual AWS wiring

1. Create the `AutomatedMessaging` Lambda and expose the `/automations` routes through API Gateway with the existing Cognito authorizer.
2. Grant this Lambda permission to invoke `UnifiedMessaging` and set `UNIFIED_MESSAGING_LAMBDA_NAME` when the function name differs.
3. Invoke `{ "action": "PROCESS_BOOKING_PAID_OUTBOX" }` on a short EventBridge schedule.
4. Invoke `{ "action": "PROCESS_DUE_DELIVERIES" }` on a short EventBridge schedule. The handler is idempotent and safely reclaims stale processing records.
5. Apply `../UnifiedMessaging/migrations/005_add_unified_thread_booking_id.sql` first when booking-scoped messaging is not already migrated.
6. Apply `migrations/001_create_automated_messaging_v1.sql` before enabling routes or either schedule.
7. Call authenticated `GET /automations/health` as a deployment gate. It performs read-only schema validation and returns `503 SCHEMA_NOT_READY` when required columns or unique indexes are missing.
8. Configure `REACT_APP_AUTOMATED_MESSAGING_API_URL` for the web application.

The Lambda never creates or alters database objects at runtime. Both SQL migrations remain explicit manual deployment steps.

No Email, SMS, WhatsApp, or OTA delivery is implemented by this function.
