# Property review admin allowlist

`PROPERTY_REVIEW_ADMIN_USER_IDS` decides who may approve or reject a property that a host submitted for review (#3302). The endpoints are `POST /property/review/approve` and `POST /property/review/reject` on `PropertyHandler`.

## What it holds

A list of Cognito `Username` values (the same id PropertyHandler uses as `hostId`), separated by commas, semicolons or spaces. Matching is exact and case-sensitive. A caller's Cognito group is not checked: being on this list is the only thing that makes someone a reviewer.

## Fail closed

If the variable is missing or empty, nobody can review. A caller who is not on the list gets `403`; a missing or invalid token gets `401`. There is no default or fallback list.

## Where it is set

On the `PropertyHandler` Lambda in `eu-north-1`. Acceptance and production share this one function, so the same list applies to both. It is a Lambda variable only: never put it in Amplify or in a `REACT_APP_*` variable, because that would publish it in the frontend bundle.

## Changing it

`aws lambda update-function-configuration --environment` replaces every variable on the function. Read the current variables first, add or remove the one id, and write back the whole set. The steps are in [Changing an environment variable](../../partner/integrations/channel_manager/channex/channex_production_switch_runbook.md#changing-an-environment-variable). Keep the `env.json` outside the repository and delete it straight after the update.

## Never commit IDs

Real user ids are set at deploy time only. Code, tests, docs and pull requests use fake ids such as `admin-1`.

## Read routes

Three admin-only `GET` routes on `PropertyHandler` serve the review queue. Responses carry `Cache-Control: no-store`.

| Route | Answer |
| --- | --- |
| `/property/review/access` | `200 { allowed }` for any signed-in caller, `401` without a valid token |
| `/property/review/queue?limit=&cursor=` | `PENDING_REVIEW` cards, oldest first, plus `nextCursor` (`null` on the last page). `limit` defaults to 25, max 50. `403` for non-admins |
| `/property/review/detail?propertyId=` | Full property with full location, any status. `400` without an id, `404` if missing, `403` for non-admins |

API Gateway has no `{proxy+}`, so each route needs a `GET` method, an `OPTIONS` method for CORS and an API deployment, added by hand after the Lambda is live. Deploying the Lambda alone does not expose them.
