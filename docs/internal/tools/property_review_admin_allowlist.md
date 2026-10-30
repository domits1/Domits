# Property review admin allowlist

`PROPERTY_REVIEW_ADMIN_USER_IDS` decides who may approve or reject a property that a host submitted for review (#3302). The endpoints are `POST /property/review/approve` and `POST /property/review/reject` on `PropertyHandler`.

## Request and response

Both endpoints take a JSON body and return `{ "propertyId", "status", "updatedAt" }` on success.

- `propertyId`: required.
- `updatedAt`: required, the `property.updatedAt` the reviewer saw (a non-negative integer in milliseconds). Anything else is a `400`.
- `reason`: required on reject (1 to 500 characters after trimming, else `400`). Sending `reason` on approve is a `400`.

A `409` body is `{ "message", "code" }`: `wrong_status` when the property is not `PENDING_REVIEW`, `stale_review` when its `updatedAt` changed after the reviewer loaded it. A `503` means a write conflict outlived the retries; try again.

`stale_review` only detects edits that update `property.updatedat` (status, overview, registration number), not pricing, images, amenities, rules, location or availability.

Every submit, approve and reject writes one `property_moderation_event` row in the same transaction as the status change.

Merge blocker cleared: property_moderation_event now exists on main (applied 2026-10-30, see [dsql_property_moderation_event_runbook.md](dsql_property_moderation_event_runbook.md)).

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
