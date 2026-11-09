# Communication Preferences

## Runtime

- Lambda handler: `index.handler`
- `GET /user/communication-preferences?persona=host` returns the authenticated user's saved Host communication preferences, or product defaults when no Host row exists.
- `GET /user/communication-preferences?persona=guest` returns the authenticated user's saved Guest communication preferences, or product defaults when no Guest row exists.
- `PUT /user/communication-preferences?persona=host` saves the complete Host preference matrix for the authenticated user.
- `PUT /user/communication-preferences?persona=guest` saves the complete Guest preference matrix for the authenticated user.

## Authentication

- Every `GET` and `PUT` route MUST use `DomitsCognitoAuthorizer`.
- The authenticated user identity is `claims.sub` from API Gateway/Cognito authorizer claims.
- The preference identity is `(claims.sub, persona)`.
- The API must not accept `userId` from the request body, query string, or path parameters.
- The `persona` query parameter is required and must be `host` or `guest`; the backend normalizes it to `HOST` or `GUEST`.
- `OPTIONS` remains unauthenticated for CORS preflight requests.
- Do not use `backend/CD/npm/createLambda.js` as-is for this endpoint because it creates API Gateway methods with `authorizationType` set to `NONE`.

## Lambda Prerequisites

- The Lambda must exist before CI/deployment attempts to update its code.
- The execution role should follow the existing `General-Lambda-Function` pattern.
- The execution role requires SSM `GetParameter` access for the Aurora DSQL configuration parameters.
- The execution role requires Aurora DSQL connection permission.

## Database Prerequisite

- The `main.communication_preferences` migration must be applied through the approved Domits database process before enabling the endpoint.
- This function does not run migrations at runtime.


## Host Notification Matrix

The Host Dashboard uses a separate matrix scope on the existing authenticated endpoint:

- `GET /user/communication-preferences?persona=host&scope=matrix` returns the authenticated user's event preferences.
- `PUT /user/communication-preferences?persona=host&scope=matrix` saves the complete submitted event preference matrix.
- Matrix preferences are stored by authenticated user in `main.host_notification_preferences`.
- Engineering preferences are returned and writable only when the authenticated claims identify the user as `Admin` or `Engineer`. The backend enforces this independently of frontend visibility.
- A host update omits the Engineering section and preserves its previously stored values.
- The existing Host/Guest email, SMS and Push preference contract remains unchanged.

The matrix catalog includes Bookings, Property Manager, Staff & Tasks, Property Owner, Finance, Distribution, Engineering and Compliance. Guest-specific journey preferences remain in the Guest Dashboard.

## Database Prerequisite

- Apply `backend/ORM/migrations/20261109_host_notification_preferences.js` through the approved Domits database process before enabling matrix preference storage.
- The migration creates `main.host_notification_preferences`; the function does not run migrations at runtime.

## Delivery Integration Scope

This endpoint stores the user's event preferences. Existing notification producers and delivery services must separately consult these preferences before dispatching events. This UI/API change alone does not suppress or reroute notifications that are still sent by producers using hard-coded recipient rules.
