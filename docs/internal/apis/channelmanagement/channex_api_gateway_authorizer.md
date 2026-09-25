# Cognito authorizer on the Channex and Holidu routes

| | |
|---|---|
| Issue | #3266 (capability #440) |
| API | `54s3llwby8` (UnifiedMessaging), region `eu-north-1`, stage `default` |
| Applied | 24 September 2026 |
| Related | #3267 (the Lambda takes the user from the token), #3281 (webhook, must stay unauthenticated) |

## 1. Why

Since #3267 the shared channel-management handler reads the user from the Cognito claims (`requestContext.authorizer.claims.sub`) and returns 401 when they are missing. Before this change the Channex routes were served only by the catch-all `/{proxy+}`, which has no authorizer, so no claims ever reached the Lambda and the Channex admin page was answered with 401 for everyone.

## 2. What the API looks like now

| Path | Method | Login required? | Goes to |
|---|---|---|---|
| `/integrations` | ANY | No | UnifiedMessaging |
| `/integrations/{proxy+}` | ANY | No | UnifiedMessaging |
| `/integrations/channex/{proxy+}` | ANY | **Yes** | UnifiedMessaging |
| `/integrations/holidu/{proxy+}` | ANY | **Yes** | UnifiedMessaging |
| `/{proxy+}` | ANY | No | UnifiedMessaging, unchanged |

Every new resource also has `OPTIONS` without a login and a MOCK integration for CORS, copied from the existing `/{proxy+}`: `Access-Control-Allow-Headers: 'Content-Type,Authorization'`, `Access-Control-Allow-Methods: 'GET,POST,OPTIONS'`, `Access-Control-Allow-Origin: '*'`.

The authorizer is the one that already existed: `DomitsCognitoAuthorizer`, id `wgzgpr`, type `COGNITO_USER_POOLS`, user pool `eu-north-1_mPxNhvSFX`, identity source `method.request.header.Authorization`. The frontend already sends the ID token (`channexApi.js`, `Authorization: Bearer <idToken>`).

*Resource ids:* `/integrations` `ysij0h`, `/integrations/{proxy+}` `ajp10w`, `/integrations/channex` `vy3qu2`, `/integrations/channex/{proxy+}` `mr5vm8`, `/integrations/holidu` `34eaq0`, `/integrations/holidu/{proxy+}` `ggrjrw`.

## 3. Why `/integrations/{proxy+}` has to exist

API Gateway matches a request down the resource tree and **never falls back** to an ancestor's `{proxy+}`. As soon as `/integrations` exists as a resource, a request to `/integrations/whatsapp/connect/start` is only matched against children of `/integrations`. Without a `{proxy+}` there, API Gateway answers `403 Missing Authentication Token` instead of passing the request to the root proxy.

So `/integrations/{proxy+}` keeps WhatsApp and every other integration route working, while the literal `channex` and `holidu` segments take precedence over it and do require a login.

The parents `/integrations/channex` and `/integrations/holidu` deliberately have no methods. A request to exactly those paths returns 403; nothing calls them.

## 4. What was verified

First on a temporary `authtest` stage, then on `default` (the `authtest` stage has since been deleted):

| Check | Result |
|---|---|
| No token on a Channex route | 401 `UnauthorizedException` from API Gateway; the Lambda is never called |
| Valid ID token | 200, claims reach the Lambda |
| `OPTIONS` on a Channex route | 200 with the three CORS headers |
| `GET /integrations?userId=` | 200, unchanged |
| `/integrations/whatsapp/...` | the Lambda's own 404, identical to before the change |
| Channex admin page | resources load, mapping saved, readiness "Ready" |

Not tested live: a 403 for a user who is not in `CHANNEX_CERTIFICATION_USER_IDS`, because both available accounts are in that allowlist. That path is unchanged by this work and is covered by the unit tests of #3267.

## 5. Things to know before changing this again

- **A deployment takes up to a minute to take effect.** Calls made seconds after `create-deployment` still show the old behaviour. Wait before concluding that something is broken.
- **A deployment publishes the whole draft**, including unfinished changes made by others in the console. Check CloudTrail for `Create*`, `Put*`, `Update*` and `Delete*` events on `apigateway.amazonaws.com` since the last `CreateDeployment` before deploying.
- **No extra Lambda permission is needed.** `UnifiedMessaging-ProxyInvokePermission` already covers `54s3llwby8/*/*/*`.
- **The webhook of #3281 must not get this authorizer.** Channex calls it without a Cognito token; it is authenticated with a secret header instead. Give it its own resource under `/integrations/channex/` with `authorization-type NONE`, since the literal path beats the protected `{proxy+}`.

## 6. Rollback

Fastest, keeping the resources: set the two `ANY` methods back to no authorizer and deploy.

```
aws apigateway update-method --rest-api-id 54s3llwby8 --region eu-north-1 \
  --resource-id mr5vm8 --http-method ANY \
  --patch-operations op=replace,path=/authorizationType,value=NONE

aws apigateway update-method --rest-api-id 54s3llwby8 --region eu-north-1 \
  --resource-id ggrjrw --http-method ANY \
  --patch-operations op=replace,path=/authorizationType,value=NONE

aws apigateway create-deployment --rest-api-id 54s3llwby8 --region eu-north-1 \
  --stage-name default --description "rollback 3266"
```

Complete rollback: delete resource `ysij0h` (which removes the whole `/integrations` tree) and deploy. Everything then goes back through the root `/{proxy+}`, exactly as before 24 September.
