# Communication Preferences

## Runtime

- Lambda handler: `index.handler`
- `GET /user/communication-preferences?persona=host` returns the authenticated user's saved Host channel preferences, or product defaults when no Host row exists.
- `GET /user/communication-preferences?persona=guest` returns the authenticated user's saved Guest channel preferences, or product defaults when no Guest row exists.
- `PUT /user/communication-preferences?persona=host` saves the complete Host channel preference matrix.
- `PUT /user/communication-preferences?persona=guest` saves the complete Guest channel preference matrix.
- `GET /user/communication-preferences?persona=host&view=host-events` returns the authenticated host's event-level notification preferences.
- `PUT /user/communication-preferences?persona=host&view=host-events` saves the complete event-level matrix for the authenticated host.
- Each host event stores three channel choices: `inApp`, `email` and `sms`. New records default to In-app and Email enabled, with SMS disabled.
- The backend validates the complete event-key and channel allowlists. The frontend catalog composes the same event identifiers from category prefixes and suffixes; keep the two definitions aligned.
- Legacy boolean values are normalized when read: `true` maps to the new In-app/Email defaults and `false` disables all three channels.
- These preferences are persisted settings. Notification producers and delivery workers still need to enforce them before sending notifications; this change does not modify delivery behavior.

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
- The `main.host_notification_preferences` migration (`20261109_host_notification_preferences.js`) must be applied through the approved Domits database process before enabling the host event matrix.
- The host table stores one JSON preference document per authenticated host.
- This function does not run migrations at runtime.
