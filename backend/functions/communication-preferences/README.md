# Communication Preferences

## Runtime

- Lambda handler: `index.handler`
- `GET /user/communication-preferences?persona=host` returns the authenticated user's saved Host channel preferences, or product defaults when no Host row exists.
- `GET /user/communication-preferences?persona=guest` returns the authenticated user's saved Guest channel preferences, or product defaults when no Guest row exists.
- `PUT /user/communication-preferences?persona=host` saves the complete Host channel preference matrix.
- `PUT /user/communication-preferences?persona=guest` saves the complete Guest channel preference matrix.
- `GET /user/communication-preferences?persona=host&view=host-events` returns the canonical host event catalog and that host's saved event-level preferences.
- `PUT /user/communication-preferences?persona=host&view=host-events` saves the complete event-level matrix for the authenticated host.
- The backend owns the canonical host event catalog, including category labels and event names. The frontend renders the catalog returned by GET and does not maintain a duplicate event-key list.
- Each host event stores three channel choices: `inApp`, `email` and `sms`. New records default to In-app and Email enabled, with SMS disabled.
- The backend validates the complete event-key and channel allowlists. Email is kept enabled for reservation and cancellation events, matching the previous Host settings behavior.
- When a host has no matrix row yet, the GET endpoint maps the existing Host row in `main.communication_preferences` into matching reservation, cancellation and message events. Legacy Push maps to In-app; Email and SMS retain their saved values. The next successful save writes the complete matrix to the new table.
- Legacy boolean values in the matrix document are normalized when read. Required reservation/cancellation emails remain enabled.
- Notification producers and delivery workers do not yet enforce the full 87-event matrix. Delivery integration is tracked separately because the catalog spans multiple producers and recipient types; this API change persists the preferences but does not silently change delivery behavior.

## Authentication

- Every `GET` and `PUT` route MUST use `DomitsCognitoAuthorizer`.
- The authenticated user identity is `claims.sub` from API Gateway/Cognito authorizer claims.
- The preference identity is the authenticated user ID; host event preferences are available only with `persona=host`.
- The API must not accept `userId` from the request body, query string, or path parameters.
- The `persona` query parameter is required and must be `host` or `guest`; the backend normalizes it to `HOST` or `GUEST`.
- `OPTIONS` remains unauthenticated for CORS preflight requests.
- Do not use `backend/CD/npm/createLambda.js` as-is for this endpoint because it creates API Gateway methods with `authorizationType` set to `NONE`.

## Lambda Prerequisites

- The Lambda must exist before CI/deployment attempts to update its code.
- The execution role should follow the existing `General-Lambda-Function` pattern.
- The execution role requires SSM `GetParameter` access for the Aurora DSQL configuration parameters.
- The execution role requires Aurora DSQL connection permission.

## Database Prerequisites

- The `main.communication_preferences` migration must be applied through the approved Domits database process before enabling the existing channel preferences endpoint.
- Apply `backend/ORM/migrations/20261109_host_notification_preferences.sql` to `test` first and then `main`. Follow `docs/internal/tools/dsql_host_notification_preferences_runbook.md`.
- A database operator with Aurora DSQL Admin access runs the migration after backend review and before the host event endpoint is enabled on acceptance. The PR author coordinates the run and verifies both schemas.
- The host table stores one JSON preference document per authenticated host. The TypeORM migration file creates the main-schema table for migration-managed environments; the SQL runbook is the manual DSQL deployment procedure.
- This function does not run migrations at runtime.
