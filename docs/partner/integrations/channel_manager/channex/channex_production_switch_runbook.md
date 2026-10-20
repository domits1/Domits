# Channex production switch runbook

Status: draft, not yet executed.

Switches the Domits backend from Channex staging (`staging.channex.io`) to Channex production (`app.channex.io`) and connects the first live property. Read it once fully before starting. Every step has a check; do not continue when a check fails, go to [Rollback](#rollback).

## What changes

```text
before:  Domits Lambdas ──▶ staging.channex.io   (test host, Emerald Estate ↔ Domits Test Property 1)
after:   Domits Lambdas ──▶ app.channex.io       (villa host, Wellness Villa Bisous ↔ production property)
```

- The Channex address is one setting for the whole backend: `CHANNEX_BASE_URL` (`backend/functions/.shared/channelManagement/providers/channex/providerClient.js:3`, default staging). After the switch, every Channex call goes to production: ARI pushes, the booking feed, acknowledgements and guest messages.
- Staging testing stops for Domits. The staging test property and its Booking.com test channel no longer reach Domits.
- The deploy pipeline only replaces Lambda code (`aws lambda update-function-code`), so the environment variables set here stay after later deploys.

## Facts used in this runbook

| Item | Value |
|---|---|
| Lambdas that contain the Channex code | `ChannelManagement`, `UnifiedMessaging`, `General-Bookings-CRUD-Bookings-develop`, `PropertyHandler` |
| Setting for the Channex address | `CHANNEX_BASE_URL` |
| Admin allowlist (who may use the Channex diagnostics page and its endpoints) | `CHANNEX_CERTIFICATION_USER_IDS` (comma-separated Domits user ids) |
| Where API keys are stored | Secrets Manager, prefix `domits/channex`, one secret per Domits user (`credentialStore.js`) |
| Booking webhook secret | Secrets Manager `domits/channex/webhook/bookings`, sent by Channex in header `X-Channex-Webhook-Secret` |
| Booking webhook URL | `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/webhooks/channex/bookings` |
| Production property (Wellness Villa Bisous) | property `8de57ac9-4988-4bcd-9c31-b1fc1f71f97d`, room type `fab701b4-bf28-45b4-b72d-fb3e6f3c599d`, rate plan `32472362-32ca-4883-af6f-623170940636` (EUR, per room, 8 guests) |
| Production Channex user | `teamdomits@gmail.com` |

An API key is stored per Domits user, and saving a mapping checks that the user owns the property (#3365). The villa therefore has to be connected while logged in to Domits as the villa's host.

## Before the switch (day before)

- [ ] **P1. Staging tests finished.** Messaging tests on staging are done (team informed), and the staging test bookings are cancelled.
- [ ] **P2. Monitoring v1 is live** (#3620): the alarms in [Alarms](#alarms) exist and a test alarm email arrived.
- [ ] **P3. Villa ready in Domits.** Prices, blocked dates, minimum stay and existing bookings in Calendar & Pricing are correct; this is what Channex receives.
- [ ] **P4. Villa host's Domits user id is known** (Cognito `sub` of the host account). Needed for the allowlist.
- [ ] **P5. Channex production property checked** (ids above). No channel connected yet.
- [ ] **P6. Moment agreed with the team.** Nobody is testing on staging during the switch.

## The switch

Time needed: about 2–4 hours including checks.

### S1. Outbox is empty

Run in the Aurora DSQL query editor:

```sql
SELECT status, COUNT(*) FROM main.channex_ari_outbox
WHERE status IN ('PENDING', 'PROCESSING')
GROUP BY status;
```

Check: no rows. Otherwise wait a few minutes; pending staging changes must not be sent to production.

### S2. Disconnect the staging test account

The test host (Emerald Estate) is connected with a staging API key. The outbox only sends for connected accounts (`channexAriOutboxWorker.js:38`), so disconnecting it stops its changes from going to production with a staging key.

Logged in to Domits as the test host, on the Channex diagnostics page, browser console:

```js
const k = (s) => localStorage[Object.keys(localStorage).find((x) => x.endsWith(s))];
await fetch("https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/integrations/channex/disconnect", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + k(".idToken") },
  body: JSON.stringify({ userId: k(".LastAuthUser") }),
}).then((r) => r.json());
```

Check: the response says the integration is disconnected. The staging secret is kept, so this can be undone by connecting again.

### S3. Allow the villa host on the admin endpoints

Add the villa host's user id to `CHANNEX_CERTIFICATION_USER_IDS` on `ChannelManagement` and `UnifiedMessaging` (see [Changing an environment variable](#changing-an-environment-variable)). Keep the existing ids.

Check: logged in to Domits as the villa host, the menu shows "Channex diagnostics".

### S4. Point the backend at production

Set `CHANNEX_BASE_URL=https://app.channex.io` on all four Lambdas (see [Changing an environment variable](#changing-an-environment-variable)).

Check, per Lambda:

```bash
aws lambda get-function-configuration --function-name ChannelManagement --query "Environment.Variables.CHANNEX_BASE_URL" --output text
```

Expected: `https://app.channex.io`.

### S5. Create the production API key and connect it

1. Channex production (logged in as `teamdomits@gmail.com`) → API Keys → Create new API key.
2. Copy the key once, straight into the next step. Never in chat, documents or code.
3. Domits, logged in as the villa host → Channex diagnostics → Setup & Connection → Connect → paste the key.

Check: Overview shows status `CONNECTED`. The key is stored in Secrets Manager; Domits does not show it again.

### S6. Map the villa

Channex diagnostics → Setup & Connection → Load Channex resources → select Wellness Villa Bisous, Entire Villa, Standard Rate → Save mapping.

Saving a ready mapping queues a full sync (#3282).

Check, after 2–3 minutes:
- Evidence → Refresh latest evidence: a full sync with 2 task ids (availability, rates/restrictions), no errors.
- Channex production → Inventory → Wellness Villa Bisous: prices, availability and restrictions match the Domits calendar for the next months.

### S7. Production booking webhook

Channex production → Webhooks → Property Webhooks → Create:

| Field | Value |
|---|---|
| Property | Wellness Villa Bisous |
| Callback URL | the booking webhook URL above |
| Events | `booking` (new, modified, cancelled) |
| Headers | `X-Channex-Webhook-Secret` = the value of secret `domits/channex/webhook/bookings` |
| Send data | off (Domits reads the feed itself) |
| Signed (HMAC) | off for now; signature checking is not built yet (#3574) |

Check: the webhook's test call answers `200`. This only proves the webhook is reachable; S8 proves that bookings are processed.

### S8. End-to-end check

1. **Prices and availability out:** change one price on a date for the villa in Domits; after about 2 minutes the evidence shows one call and Channex Inventory shows the new price. Change it back.
2. **Bookings in:** in Channex production → Bookings → New booking, create a test booking on the villa for one free night (no OTA is connected yet, so no guest is affected). The "New booking" button comes from the Booking CRS app; install it under Applications if the button is missing.
   - Check, within about 1 minute: the booking is in Domits → Reservations with the right dates and amount, Channex shows it as acknowledged, and the night is closed in the Domits calendar.
   - Cancel the booking in Channex straight after. Check: Domits shows it as cancelled and the night is open again.
   - If the booking does not reach Domits, the switch is not complete: check the `channex-webhook-*` alarms and the ChannelManagement logs before connecting any OTA.

## After the switch

- [ ] Write the date, task ids and checks into the Status section of this runbook.
- [ ] Inform the team that Domits now talks to Channex production.
- [ ] Watch the alarms and the evidence for the first days.
- [ ] Deactivate the staging property webhook (Channex staging → Webhooks), so the shared webhook secret is only used by production.
- [ ] Set up the production guest-message webhook with the messaging owner; guest messages also go to production after S4.

## Connecting an OTA after the switch

The switch is done once for the whole backend. Connecting a listing to an OTA is a short routine per property and per OTA, part of it done by the host:

| Step | Who | Time |
|---|---|---|
| Property, room type and rate plan in Channex production, mapping saved in Domits (full sync follows) | Domits | about 20 minutes |
| Booking.com: Account → Connectivity provider → Channex.io, then share the Hotel ID | Host (two-step verification on their phone) | about 5 minutes |
| Airbnb: log in to the host's Airbnb account through Channex | Host or Domits with the host | about 5 minutes |
| Channels → Create → OTA → map room and rate → Activate | Domits | about 15–30 minutes |
| Check prices, availability and a first booking | Domits | about 15 minutes |

The listing must already exist on the OTA; a new Booking.com listing needs Booking.com's approval first, which takes days.

## Alarms

Set up for #3620 in `eu-north-1`. All alarms send an email through the SNS topic `channex-alerts` when they go to ALARM and when they return to OK. Threshold: 1 or more in 5 minutes; no data counts as OK.

| Alarm | Watches | What it means | What to do |
|---|---|---|---|
| `channex-outbox-rows-failed` | Metric filter `ChannexOutboxRowsFailed` on `"CHANNEX_ARI_OUTBOX_ROWS_FAILED"` | A price, availability or restriction change will never reach Channex (rejected, or 8 failed attempts) | Look up the log line (property id, reason) in the ChannelManagement logs; check Channex diagnostics → Evidence; fix the cause, then save the dates again in the calendar so a new change is queued |
| `channex-webhook-rejected` | Metric filter `ChannexWebhookRejected` on `"CHANNEX_BOOKING_WEBHOOK_SECRET_REJECTED"` | A call to the booking webhook had a wrong or missing secret header | Check the webhook's `X-Channex-Webhook-Secret` header in Channex against the secret; repeated calls from elsewhere are probing and can be ignored |
| `channex-webhook-errors` | Metric filter `ChannexWebhookErrors` on the webhook's unexpected-error, unreadable-credentials and secret-unavailable lines | The booking webhook could not process a delivery | Check the ChannelManagement logs; Channex retries for about 24 hours, so bookings arrive once the cause is fixed |
| `channelmanagement-errors` | `AWS/Lambda` `Errors`, function `ChannelManagement` | The Lambda threw an error | Check the ChannelManagement logs for the failing request |
| `channelmanagement-throttles` | `AWS/Lambda` `Throttles`, function `ChannelManagement` | The Lambda hit its reserved concurrency | Check whether many webhooks arrived at once; consider raising the reserved concurrency |

The metric filters use text patterns: the Lambda's text log format puts a timestamp and request id before each JSON line, so a JSON selector would not match.

After the switch, check that the booking webhook still logs to `/aws/lambda/ChannelManagement`; if it logs to another function, add the same filters there.

## Rollback

In reverse order, only as far as needed:

1. Deactivate the production property webhook in Channex.
2. Disconnect the villa host's Channex account (S2 snippet, logged in as the villa host).
3. Set `CHANNEX_BASE_URL` back to `https://staging.channex.io` on all four Lambdas.
4. Reconnect the test host with a staging API key (Setup & Connection → Connect). Channex shows a key only once and Domits does not show it again; if the old key was not saved, create a new one on `staging.channex.io` → API Keys.
5. Remove the villa host from `CHANNEX_CERTIFICATION_USER_IDS` if no longer needed.

## Changing an environment variable

`aws lambda update-function-configuration --environment` replaces all variables of the function, so always start from the current set. PowerShell, per function:

```powershell
$fn = "ChannelManagement"
$vars = aws lambda get-function-configuration --function-name $fn --query "Environment.Variables" --output json | ConvertFrom-Json
$vars | Add-Member -NotePropertyName CHANNEX_BASE_URL -NotePropertyValue "https://app.channex.io" -Force
@{ Variables = $vars } | ConvertTo-Json -Depth 5 | Set-Content -Encoding ascii env.json
aws lambda update-function-configuration --function-name $fn --environment file://env.json --query "LastUpdateStatus"
Remove-Item env.json
aws lambda wait function-updated --function-name $fn
aws lambda get-function-configuration --function-name $fn --query "LastUpdateStatus" --output text
```

Check: the last command prints `Successful`. The update runs asynchronously, so do not move on to the next function or step before that. If it prints `Failed`, run the block again; it starts from the current variables.

`env.json` holds every variable of the function, including secrets; it is deleted straight after the update call on purpose and must never be committed. For the allowlist, read the current `CHANNEX_CERTIFICATION_USER_IDS`, append the new id with a comma, and set the result the same way.

## Status

Not executed yet.
