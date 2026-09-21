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
