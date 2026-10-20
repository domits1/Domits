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

## What One Cancel Run Does

With `"task": "cancel-cancelled-bookings"` the same Lambda handles cancelled bookings instead:

1. Lists up to `limit` Truvi rows in `guest_risk_assessment` that have a `providerassessmentid`, whose booking has status `Cancelled` or `Canceled`, and whose status is not `CANCELLED` or `CANCEL_REFUSED` yet.
2. Sends `PUT /verificationRequests/cancel` with the verification id and the booking id as reservation id.
3. Saves `CANCELLED` on a 200, and also on `already cancelled` (a retry of a request that went through).
4. Saves `CANCEL_REFUSED` with the reason when Truvi cannot cancel anymore: the check-in has passed, the verification is screening only, or Truvi does not know it. These rows are not tried again.
5. Leaves the row for the next run on a timeout or a 5xx.
6. Fails the run on any other 400, without saving, because that means the request itself is wrong.

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

- `TRUVI_SCREENING_ENABLED` switches both tasks. If it is not exactly `true`, the run returns `{ "skipped": true }` without reading the secret, the database or calling Truvi.
- An event with another task than `screen-pending-bookings`, `cancel-cancelled-bookings` or `modify-changed-bookings` returns 400 and does nothing.
- A missing or invalid `TRUVI_EXTENDED_AMOUNT` or a non-https `TRUVI_BASE_URL` fails the run before any Truvi call.

## What One Modify Run Does

With `"task": "modify-changed-bookings"` the Lambda sends date changes to Truvi:

1. Lists up to `limit` Truvi rows with a verification id and status `PASSED`, `FLAGGED` or `FAILED`, whose booking is not cancelled, whose check-out is still in the future, and whose `arrivaldate`/`departuredate` in `guest_risk_assessment` differ from the booking (or are still empty).
2. A row with empty dates only gets the current booking dates saved, without a Truvi call. This sets the starting point for rows screened before the dates columns existed and for new screenings.
3. When the dates differ on the day, sends `PUT /verificationRequests` with both new dates (Truvi only accepts the dates, it does not screen again).
4. Saves the new dates on a 200, so the booking is not sent again.
5. When Truvi refuses (check-in or check-out in the past, verification cancelled or unknown), saves the new dates with the reason in `errormessage`, so it is not sent again.
6. Leaves the row for the next run on a timeout or a 5xx, and fails the run on any other 400.

Uses the `arrivaldate` and `departuredate` columns of `guest_risk_assessment` (in the create migration of #3555).

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

Cancel rule:

```text
domits-truvi-cancel-rate-15-minutes
rate(15 minutes)
```

Target input:

```json
{
  "task": "cancel-cancelled-bookings",
  "limit": 10
}
```

Modify rule:

```text
domits-truvi-modify-rate-15-minutes
rate(15 minutes)
```

Target input:

```json
{
  "task": "modify-changed-bookings",
  "limit": 10
}
```

Truvi only accepts a cancel up to the check-in day (until 12:00 UTC the day after). A booking cancelled later ends as `CANCEL_REFUSED`.

## Enablement Steps

1. Confirm the Truvi code is deployed to the `Truvi-Integration` Lambda.
2. Set the environment variables, with `TRUVI_SCREENING_ENABLED=false` first.
3. Run the manual test event below. Expect `{ "skipped": true, ... }`.
4. Set `TRUVI_SCREENING_ENABLED=true` and run the test event again. Expect a summary with `listed`, `saved`, `retryLater`, `rejected` and an empty `errors` list.
5. Check the new rows in `guest_risk_assessment`.
6. Create the EventBridge rule with the target input from this document, disabled.
7. Enable the rule and watch the CloudWatch logs of the first runs.

## Manual Lambda Test Event

Use `backend/functions/Truvi-Integration/events/truvi-screen-pending-bookings.event.json` for screening, `truvi-cancel-cancelled-bookings.event.json` for cancellations and `truvi-modify-changed-bookings.event.json` for date changes:

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
- Do not claim guest, listing or amount changes are sent to Truvi; Truvi only accepts new dates on a modify.
- Do not claim a date change is sent at once; it is picked up within 15 minutes.
- Do not claim a cancelled booking keeps its screening status; the row status becomes `CANCELLED` or `CANCEL_REFUSED`.
- Do not claim Truvi webhooks are handled.
- Do not claim retries are idempotent at Truvi: a retried booking creates a new verification request.
