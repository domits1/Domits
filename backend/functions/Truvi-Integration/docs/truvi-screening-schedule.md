# Truvi Screening Schedule

## Purpose

The `Truvi-Integration` Lambda screens paid upcoming bookings that have no Truvi result yet and saves the result in `guest_risk_assessment` (#3371). This document describes the EventBridge schedule that runs it. It does not deploy or enable AWS resources by itself.

## Repo Deployment Pattern

`.github/workflows/deploy.yml` only updates the Lambda code. EventBridge rules, environment variables, permissions and secrets are set up by hand in the AWS Console, following this document.

`backend/functions/Truvi-Integration/.deployment-disabled` keeps the deploy workflow away from this function. Remove it in a separate pull request once the Lambda and its permissions exist.

## What One Run Does

1. Lists up to `limit` bookings (default 10, max 50) with status `Paid`, an arrival date in the future and no row in `guest_risk_assessment`.
2. Sends each booking to Truvi (`POST /verificationRequests`) and maps the answer to `PASSED`, `FLAGGED`, `FAILED` or `ERROR`.
3. Saves the result. A booking whose Truvi call timed out or got a 5xx is not saved, so the next run tries it again.
4. Fails the run (so CloudWatch shows an error) when a booking could not be handled at all, for example when the database is down.

## Prerequisites

- The `guest_risk_assessment` migration has run in the target database.
- A Lambda named `Truvi-Integration` exists (Node.js 22, ESM) with the `database` layer, like the other DSQL Lambdas.
- The Lambda role can:
  - `secretsmanager:GetSecretValue` on `domits/truvi/subscription-key` (eu-north-1)
  - `ssm:GetParameter` on `/aurora/dsql/*`
  - `dsql:DbConnectAdmin`
  - `lambda:InvokeFunction` on `GetUserInfo` (guest and host email)
- Timeout: 3 minutes. One run with `limit` 10 makes at most 10 Truvi calls of at most 10 seconds each.

## Required Environment Variables

```text
TRUVI_SCREENING_ENABLED=true
TRUVI_EXTENDED_AMOUNT=<250 | 500 | 1000 | 10000 | 50000>
```

Optional:

```text
TRUVI_SECRET_NAME=domits/truvi/subscription-key
TRUVI_BASE_URL=https://developer.api.truvi.com/screen-and-protect-sandbox
```

Without `TRUVI_BASE_URL` the Lambda uses the Truvi sandbox. Production needs the production URL from Truvi.

Safety behavior:

- If `TRUVI_SCREENING_ENABLED` is not exactly `true`, the run returns `{ "skipped": true }` without reading the secret, the database or calling Truvi.
- An event without `"task": "screen-pending-bookings"` returns 400 and does nothing.
- A missing or invalid `TRUVI_EXTENDED_AMOUNT` or a non-https `TRUVI_BASE_URL` fails the run before any Truvi call.

## EventBridge Rule

Suggested rule name:

```text
domits-truvi-screening-rate-15-minutes
```

Schedule expression:

```text
rate(15 minutes)
```

Target: `Truvi-Integration` Lambda

Target input:

```json
{
  "task": "screen-pending-bookings",
  "limit": 10
}
```

## Enablement Steps

1. Confirm the Truvi code is deployed to the `Truvi-Integration` Lambda.
2. Set the environment variables, with `TRUVI_SCREENING_ENABLED=false` first.
3. Run the manual test event below. Expect `{ "skipped": true, ... }`.
4. Set `TRUVI_SCREENING_ENABLED=true` and run the test event again. Expect a summary with `listed`, `saved`, `retryLater`, `rejected` and an empty `errors` list.
5. Check the new rows in `guest_risk_assessment`.
6. Create the EventBridge rule with the target input from this document, disabled.
7. Enable the rule and watch the CloudWatch logs of the first runs.

## Manual Lambda Test Event

Use `backend/functions/Truvi-Integration/events/truvi-screen-pending-bookings.event.json`:

```json
{
  "task": "screen-pending-bookings",
  "limit": 10
}
```

## Rollback / Disable

1. Disable the EventBridge rule.
2. Set `TRUVI_SCREENING_ENABLED=false`.

Saved results stay in `guest_risk_assessment`. Deleting a row makes the booking eligible for screening again on the next run.

## What Not To Claim

- Do not claim production screening is enabled; the default is the Truvi sandbox.
- Do not claim screening happens at booking time; it runs every 15 minutes.
- Do not claim booking changes or cancellations are sent to Truvi yet.
- Do not claim Truvi webhooks are handled.
- Do not claim retries are idempotent at Truvi: a retried booking creates a new verification request.
