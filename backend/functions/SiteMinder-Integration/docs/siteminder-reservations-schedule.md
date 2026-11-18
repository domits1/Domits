# SiteMinder Reservations Schedule

## Purpose

The `SiteMinder-Integration` Lambda reads new reservations from SiteMinder, saves them as Domits bookings, and confirms them back (#603). This document describes the EventBridge schedule that runs it. It does not deploy or enable AWS resources by itself.

How a reservation becomes a booking is in `siteminder-pmsxchange.md` (Saving reservations).

## Repo Deployment Pattern

`.github/workflows/deploy.yml` only updates the Lambda code. EventBridge rules, environment variables, permissions and secrets are set up by hand in the AWS Console, following this document.

`backend/functions/SiteMinder-Integration/.deployment-disabled` keeps the deploy workflow away from this function. Remove it in a separate pull request once the Lambda and its permissions exist.

## What One Run Does

1. Sends `OTA_ReadRQ` for undelivered reservations.
2. Saves every reservation it can (`Book`, `Modify`, `Cancel`), and reports the ones it can never save to SiteMinder with a fixed error.
3. Confirms the saved reservations in one `OTA_NotifReportRQ`.
4. Answers the counts: `read`, `skipped`, `saved`, `failed`, `retryLater`.

The run fails (so CloudWatch shows an error) when:

- a reservation has to wait for the next read (`retryLater` above 0), for example because the database failed. SiteMinder fails a reservation to the hotel after 20 reads or one hour without a confirmation, so a reservation that keeps coming back must be seen in time.
- the read or the confirmation does not reach SiteMinder.

A failed run is safe to repeat: saving the same reservation again never makes a second booking.

## Prerequisites

- A Lambda named `SiteMinder-Integration` exists (Node.js 22, ESM) with the `database` layer, like the other DSQL Lambdas.
- The Lambda role can:
  - `secretsmanager:GetSecretValue` on `domits/siteminder/pmsxchange` (eu-north-1)
  - `ssm:GetParameter` on `/aurora/dsql/*`
  - `dsql:DbConnectAdmin`
- Timeout: 2 minutes, so a run always ends before the next one starts.
- Reserved concurrency: 1, so two runs never read the same reservations at the same time.
- Asynchronous invocation: maximum retry attempts 0. The next scheduled run is the retry.

## Required Environment Variables

```text
SITEMINDER_RESERVATIONS_ENABLED=true
SITEMINDER_PMS_CODE=<our PMS code from SiteMinder>
```

Optional:

```text
SITEMINDER_CURRENCY=EUR
SITEMINDER_SECRET_NAME=domits/siteminder/pmsxchange
SITEMINDER_BASE_URL=https://tpi-pmsx.preprod.siteminderlabs.com
```

Without `SITEMINDER_BASE_URL` the Lambda uses SiteMinder pre-production. Production needs the production URL from SiteMinder.

Safety behavior:

- If `SITEMINDER_RESERVATIONS_ENABLED` is not `true` (spaces around it are allowed, other spellings are not), the run returns `{ "skipped": true }` without reading the secret, the database or calling SiteMinder.
- An event without `"task": "read-reservations"` returns 400 and does nothing.
- A missing `SITEMINDER_PMS_CODE`, an invalid `SITEMINDER_CURRENCY` or a non-https `SITEMINDER_BASE_URL` fails the run before the secret is read.

## EventBridge Rule

Suggested rule name:

```text
domits-siteminder-reservations-rate-3-minutes
```

Schedule expression:

```text
rate(3 minutes)
```

SiteMinder allows a read every 2 to 5 minutes, nothing outside that range.

Target: `SiteMinder-Integration` Lambda

Target input:

```json
{
  "task": "read-reservations"
}
```

## Enablement Steps

Before you start, this must be done:

- [ ] The hotel and its room types are linked to Domits properties (Mapping in `siteminder-pmsxchange.md`). A reservation for a room type that is not linked is refused to SiteMinder.
- [ ] SiteMinder has given us our own PMS code and login. Never turn this on against the shared pre-production account `PMSXTEST`: a confirmation there takes the reservations away from every other partner who tests with it.

1. Confirm the SiteMinder code is deployed to the `SiteMinder-Integration` Lambda.
2. Set the environment variables, with `SITEMINDER_RESERVATIONS_ENABLED=false` first.
3. Run the manual test event below. Expect `{ "skipped": true, ... }`.
4. Set `SITEMINDER_RESERVATIONS_ENABLED=true` and run the test event again. Expect the counts. `retryLater` must be 0.
5. Check the new bookings (`bookingtype = siteminder`) and the `channel_reservation_link` rows.
6. Create the EventBridge rule with the target input from this document, disabled.
7. Create a CloudWatch alarm on the Lambda `Errors` metric.
8. Enable the rule and watch the CloudWatch logs of the first runs (`SITEMINDER_RESERVATIONS_RUN`, `SITEMINDER_RESERVATION_RETRY_LATER`).

## Manual Lambda Test Event

Use `backend/functions/SiteMinder-Integration/events/siteminder-read-reservations.event.json`:

```json
{
  "task": "read-reservations"
}
```

## Rollback / Disable

1. Disable the EventBridge rule.
2. Set `SITEMINDER_RESERVATIONS_ENABLED=false`.

Saved bookings stay. Reservations that were not confirmed stay undelivered at SiteMinder and come back on the first run after the rule is enabled again, until SiteMinder fails them to the hotel after 20 reads or one hour.

## What Not To Claim

- Do not claim the schedule is running; it is off until the steps above are done.
- Do not claim Domits sends the new availability to SiteMinder after a reservation; that is step 5 in `siteminder-pmsxchange.md`, not built yet.
- Do not claim Domits warns the host about an overbooking.
- Do not claim the host dashboard shows SiteMinder bookings as channel bookings; `isChannexBooking` only knows `channex`.
