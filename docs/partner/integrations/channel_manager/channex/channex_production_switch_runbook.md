# Channex production switch runbook

Status: executed on 21 October 2026, see [Status](#status).

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
| Admin allowlist (who may use the Channex diagnostics page and its endpoints, including connect, disconnect, status and mapping; `channelManagementHandler.js`) | `CHANNEX_CERTIFICATION_USER_IDS` (comma-separated Domits user ids) |
| Where API keys are stored | Secrets Manager, prefix `domits/channex`, one secret per Domits user (`credentialStore.js`) |
| Booking webhook secret | Secrets Manager `domits/channex/webhook/bookings`, sent by Channex in header `X-Channex-Webhook-Secret` |
| Booking webhook URL | `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/webhooks/channex/bookings` |
| Domits listing of the villa | `ecd926d9-67dc-4d0a-9b40-2884d0838406` |
| Production property (Wellness Villa Bisous) | property `8de57ac9-4988-4bcd-9c31-b1fc1f71f97d`, room type `fab701b4-bf28-45b4-b72d-fb3e6f3c599d`, rate plan `32472362-32ca-4883-af6f-623170940636` (EUR, per room, 8 guests) |
| Production Channex user | `teamdomits@gmail.com` |

An API key is stored per Domits user, and saving a mapping checks that the user owns the property (#3365). The villa therefore has to be connected while logged in to Domits as the villa's host.

## Before the switch (day before)

- [ ] **P1. Staging tests finished.** Messaging tests on staging are done (team informed), and the staging test bookings are cancelled.
- [ ] **P2. Monitoring v1 is live** (#3620): the alarms in [Alarms](#alarms) exist, a test alarm email arrived, and #3621 is merged and deployed to `ChannelManagement`. Without #3621 the failed-changes log line does not exist, so `channex-outbox-rows-failed` never fires.
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

Check: the response says the integration is disconnected. Disconnecting clears the account's reference to its key (`integrationAccountRepository.js`); the staging secret stays in Secrets Manager, but undoing this means connecting again with a staging API key.

Repeat this for every connected Channex account, not only the test host. List them in the Aurora DSQL query editor:

```sql
SELECT "displayName", status FROM main.channel_integration_account
WHERE UPPER(channel) = 'CHANNEX';
```

Check: no row is `CONNECTED`. For an account nobody can log in to (for example an old test account), look up its id and copy its full row first, so it can be restored:

```sql
SELECT * FROM main.channel_integration_account
WHERE UPPER(channel) = 'CHANNEX' AND status = 'CONNECTED';
```

Then set the same fields as the disconnect endpoint, on that one id. Filter on `id`, never on `"displayName"`: every connection gets the display name "Channex" unless a name was entered, so a name can match several accounts.

```sql
UPDATE main.channel_integration_account
SET status = 'DISCONNECTED', "credentialsRef" = NULL, "externalAccountId" = NULL,
    "updatedAt" = (EXTRACT(EPOCH FROM now()) * 1000)::bigint
WHERE id = '<account id>' AND status = 'CONNECTED';
```

Check: exactly 1 row is updated.

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

1. Channex production → Organization → API Keys → Create new API key. Use the owner account: the `teamdomits@gmail.com` user only sees Webhooks on the Organization page and cannot create keys. Properties access: Only Selected → the villa, so the key cannot reach other properties of the owner account. IP access: All, because the Lambdas have no fixed IP address.
2. Copy the key once, straight into the next step. Never in chat, documents or code.
3. Domits, logged in as the villa host → Channex diagnostics → Setup & Connection → Connect → paste the key.

Check: Overview shows status `CONNECTED`. The key is stored in Secrets Manager; Domits does not show it again.

### S6. Map the villa

Channex diagnostics → Setup & Connection → fill in the Domits property ID of the villa (the field starts empty) → Load Channex resources → select Wellness Villa Bisous, Entire Villa, Standard Rate → Save mapping.

Saving a ready mapping queues a full sync (#3282).

Check, after 2–3 minutes:
- Evidence → Refresh latest evidence: a full sync with 2 task ids (availability, rates/restrictions), no errors.
- Channex production → Inventory → Wellness Villa Bisous: prices, availability and restrictions match the Domits calendar for the next months.

The evidence shows the full sync as `calendar-change`, because it runs through the outbox; a range of about 500 days shows it is the full sync. Dates outside the property's availability period (`main.property_availability`) are sent as unavailable; on 21 October the villa showed as closed in Channex after its period ended on 25 May 2027.

### S7. Production booking webhook

Channex production → Organization → Webhooks → Property Webhooks → Create:

| Field | Value |
|---|---|
| Trigger | Booking (any event) |
| Callback URL | the booking webhook URL above |
| Property | Wellness Villa Bisous |
| Headers | `X-Channex-Webhook-Secret` = the value of secret `domits/channex/webhook/bookings` |
| Send data | off (Domits reads the feed itself, so a call with a leaked secret cannot add a booking) |
| Delivery signing | Do not sign; signature checking is not built yet (#3574) |

The secret is stored as JSON (`{"webhookSecret": "..."}`, `webhookSecretVerifier.js`). Copy only the value to the clipboard, so it is never shown on screen, and clear the clipboard after pasting it into the header field:

```powershell
(aws secretsmanager get-secret-value --secret-id domits/channex/webhook/bookings --region eu-north-1 --query SecretString --output text | ConvertFrom-Json).webhookSecret | Set-Clipboard
Set-Clipboard -Value " "
```

Run the second line only after pasting.

Use "Send test message" before saving. A `401` with body `{"outcome":"UNAUTHORIZED"}` means the header value differs from the secret; it is compared character by character. Compare fingerprints instead of looking at the value. In the browser console on the Channex form:

```js
const v = [...document.querySelectorAll("input")].find((i) => i.value.endsWith("<last 6 characters shown by Channex>")).value;
[...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 8)
```

And in PowerShell, with `$s` holding the secret:

```powershell
(-join ([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($s)) | ForEach-Object { $_.ToString("x2") })).Substring(0, 8)
```

When they differ, delete the header and paste it again.

Check: the webhook's test call answers `200`. This only proves the webhook is reachable; S8 proves that bookings are processed.

### S8. End-to-end check

1. **Prices and availability out:** change one price on a date for the villa in Domits; after about 2 minutes the evidence shows one call and Channex Inventory shows the new price. Change it back.
2. **Bookings in:** in Channex production → Bookings → New booking, create a test booking on the villa for one free night (no OTA is connected yet, so no guest is affected). The "New booking" button comes from the Booking CRS app; install it under Applications if the button is missing. Source: Offline; reservation id `TEST-SWITCH-001`; customer `Test Domits` with `test@example.com`, no phone; 2 adults; Payment collect: Property, payment type: Bank Transfer, so no card details are entered.
   - Check, within about 1 minute: the booking is stored and Channex shows it as acknowledged. Check it in the database, because the Reservations page did not show the test booking during the switch:

     ```sql
     SELECT status, guestname, guests, total_price, booking_source, to_timestamp(arrivaldate / 1000) AS arrival
     FROM main.booking
     WHERE property_id = 'ecd926d9-67dc-4d0a-9b40-2884d0838406' AND bookingtype = 'channex'
     ORDER BY createdat DESC;
     ```

   - Check that the night was closed: the outbox has a `CHANNEX_IMPORT` availability row for that date with status `PROCESSED`, and Channex → Inventory shows availability 0 for that night. `PROCESSED` only means the call succeeded, so check Inventory before the cancellation below, which opens the night again.

     ```sql
     SELECT kind, changetypes, source, status, datefrom, to_timestamp(processedat / 1000) AS processed
     FROM main.channex_ari_outbox
     WHERE domitspropertyid = 'ecd926d9-67dc-4d0a-9b40-2884d0838406'
     ORDER BY createdat DESC
     LIMIT 6;
     ```
   - Cancel the booking in Channex straight after. Check: the booking status is `Cancelled`, a second `CHANNEX_IMPORT` row for that date is `PROCESSED`, and Channex → Inventory shows the night open again.
   - If the booking does not reach Domits, the switch is not complete: check the `channex-webhook-*` alarms and the ChannelManagement logs before connecting any OTA.

## After the switch

- [ ] Write the date, task ids and checks into the Status section of this runbook.
- [ ] Inform the team that Domits now talks to Channex production.
- [ ] Watch the alarms and the evidence for the first days.
- [ ] Deactivate the staging property webhook (Channex staging → Webhooks), so the shared webhook secret is only used by production.
- [ ] Rotate the booking webhook secret if it was ever shown on screen, in a screenshot or in chat; see [Rotating the booking webhook secret](#rotating-the-booking-webhook-secret).
- [ ] Set up the production guest-message webhook with the messaging owner; guest messages also go to production after S4.
- [ ] Once the first days are checked, remove the villa host from `CHANNEX_CERTIFICATION_USER_IDS`. The allowlist also covers connect and disconnect, so without it the villa host cannot disconnect or remap either; add it again the same way (S3) before any of that, including a rollback.

## Connecting an OTA after the switch

The switch is done once for the whole backend. Connecting a listing to an OTA is a short routine per property and per OTA, part of it done by the host:

| Step | Who | Time |
|---|---|---|
| Property, room type and rate plan in Channex production, mapping saved in Domits (full sync follows) | Domits | about 20 minutes |
| Booking.com: Account → Connectivity provider → Channex.io, then share the Hotel ID | Host (two-step verification on their phone) | about 5 minutes |
| Airbnb: log in to the host's Airbnb account through Channex | Host or Domits with the host | about 5 minutes |
| Confirm the Domits calendar: prices, blocked dates and minimum stay are what guests may book. After activation every open date is bookable on the OTA | Host | about 5 minutes |
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
2. Disconnect the villa host's Channex account (S2 snippet, logged in as the villa host). If the villa host was already removed from `CHANNEX_CERTIFICATION_USER_IDS`, add them back first (S3); otherwise the disconnect is refused with 403.
3. Set `CHANNEX_BASE_URL` back to `https://staging.channex.io` on all four Lambdas.
4. Reconnect the test host with a staging API key (Setup & Connection → Connect). Channex shows a key only once and Domits does not show it again; if the old key was not saved, create a new one on `staging.channex.io` → API Keys.
5. Remove the villa host from `CHANNEX_CERTIFICATION_USER_IDS` if no longer needed.

## Changing an environment variable

`aws lambda update-function-configuration --environment` replaces all variables of the function, so always start from the current set. If reading fails and the update still runs, the function loses all its variables; the blocks below therefore stop when a read fails.

Before starting, in the same PowerShell window: paste fresh credentials from the AWS access portal (they expire after about an hour) and set the region, which is not configured on every machine:

```powershell
$env:AWS_DEFAULT_REGION = "eu-north-1"
aws sts get-caller-identity --query Arn --output text
```

Setting `CHANNEX_BASE_URL` (S4, rollback step 3) on all four functions:

```powershell
foreach ($fn in "ChannelManagement", "UnifiedMessaging", "General-Bookings-CRUD-Bookings-develop", "PropertyHandler") {
  $raw = aws lambda get-function-configuration --function-name $fn --query "Environment.Variables" --output json
  if ($LASTEXITCODE -ne 0) { "STOP: could not read $fn"; break }
  $vars = $raw | ConvertFrom-Json
  if (-not $vars) { $vars = [pscustomobject]@{} }
  $before = @($vars.PSObject.Properties).Count
  $vars | Add-Member -NotePropertyName CHANNEX_BASE_URL -NotePropertyValue "https://app.channex.io" -Force
  @{ Variables = $vars } | ConvertTo-Json -Depth 5 | Set-Content -Encoding ascii env.json
  aws lambda update-function-configuration --function-name $fn --environment file://env.json --query "LastUpdateStatus" --output text | Out-Null
  $updated = $LASTEXITCODE
  Remove-Item env.json
  if ($updated -ne 0) { "STOP: update failed for $fn"; break }
  aws lambda wait function-updated --function-name $fn
  if ($LASTEXITCODE -ne 0) { "STOP: $fn did not finish updating; check LastUpdateStatus before going on"; break }
  $afterCount = aws lambda get-function-configuration --function-name $fn --query "length(keys(Environment.Variables))" --output text
  "$fn : $(aws lambda get-function-configuration --function-name $fn --query LastUpdateStatus --output text) | vars $before -> $afterCount | CHANNEX_BASE_URL = $(aws lambda get-function-configuration --function-name $fn --query Environment.Variables.CHANNEX_BASE_URL --output text)"
}
```

Check: every line shows `Successful`, the number of variables stays the same or goes up by exactly one, and the new value. For a rollback, use `https://staging.channex.io`.

Adding a user id to `CHANNEX_CERTIFICATION_USER_IDS` (S3) on `ChannelManagement` and `UnifiedMessaging`. Put the id in a variable first, never as a `<placeholder>` in the command: PowerShell reads `<` as an operator.

```powershell
$newId = "PASTE-THE-USER-ID-HERE"
foreach ($fn in "ChannelManagement", "UnifiedMessaging") {
  $raw = aws lambda get-function-configuration --function-name $fn --query "Environment.Variables" --output json
  if ($LASTEXITCODE -ne 0) { "STOP: could not read $fn"; break }
  $vars = $raw | ConvertFrom-Json
  if (-not $vars -or -not $vars.CHANNEX_CERTIFICATION_USER_IDS) { "STOP: no allowlist on $fn"; break }
  [string[]]$ids = $vars.CHANNEX_CERTIFICATION_USER_IDS -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  if ($ids -notcontains $newId) { $ids += $newId }
  $vars | Add-Member -NotePropertyName CHANNEX_CERTIFICATION_USER_IDS -NotePropertyValue ($ids -join ",") -Force
  @{ Variables = $vars } | ConvertTo-Json -Depth 5 | Set-Content -Encoding ascii env.json
  aws lambda update-function-configuration --function-name $fn --environment file://env.json --query "LastUpdateStatus" --output text | Out-Null
  $updated = $LASTEXITCODE
  Remove-Item env.json
  if ($updated -ne 0) { "STOP: update failed for $fn"; break }
  aws lambda wait function-updated --function-name $fn
  if ($LASTEXITCODE -ne 0) { "STOP: $fn did not finish updating; check LastUpdateStatus before going on"; break }
  [string[]]$after = (aws lambda get-function-configuration --function-name $fn --query "Environment.Variables.CHANNEX_CERTIFICATION_USER_IDS" --output text) -split ","
  "$fn : $(aws lambda get-function-configuration --function-name $fn --query LastUpdateStatus --output text) | ids: $($after.Count) | new id on list: $($after -contains $newId) | each 36 chars: $(-not ($after | Where-Object { $_.Length -ne 36 }))"
}
```

Check: every line shows `Successful`, one id more than before (or the same number when the block is run again and the id was already on the list), `new id on list: True` and `each 36 chars: True`. `[string[]]` matters: with exactly one id, PowerShell otherwise keeps a plain string, and `+=` glues the two ids together without a comma. For removing an id, filter it out of `$ids` instead of adding it.

`env.json` holds every variable of the function, including secrets; it is deleted straight after the update call on purpose and must never be committed.

## Rotating the booking webhook secret

The secret is stored as JSON in `domits/channex/webhook/bookings` and read by the Lambda with a cache of at most 5 minutes (`webhookSecretVerifier.js`). Channex counts a `401` as delivered and does not retry it. Between storing the new secret and the last container reading it (up to 5 minutes after Channex is updated), a real booking webhook can be rejected; that booking then stays unacknowledged in Channex and only reaches Domits with the next booking webhook for that property, while its nights stay open in Domits. Rotate while no OTA is connected when possible, update Channex straight after the secret, and always do step 5.

1. Check the secret holds only `webhookSecret`; writing a new value replaces the whole JSON:

   ```powershell
   (aws secretsmanager get-secret-value --secret-id domits/channex/webhook/bookings --query SecretString --output text | ConvertFrom-Json).PSObject.Properties.Name
   ```

2. Generate and store a new value. The JSON goes through a file, because PowerShell 5.1 strips the quotes from an inline argument:

   ```powershell
   $b = New-Object byte[] 45; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
   $new = ([Convert]::ToBase64String($b)) -replace '[+/=]', ''
   @{ webhookSecret = $new } | ConvertTo-Json -Compress | Set-Content -Encoding ascii secret.json
   aws secretsmanager put-secret-value --secret-id domits/channex/webhook/bookings --secret-string file://secret.json --query VersionId --output text
   Remove-Item secret.json
   $stored = (aws secretsmanager get-secret-value --secret-id domits/channex/webhook/bookings --query SecretString --output text | ConvertFrom-Json).webhookSecret
   "stored equals new: $($stored -ceq $new)"
   ```

3. `$new | Set-Clipboard`, then in Channex production replace the header value of the property webhook.
4. Wait 5 minutes for the cache, use "Send test message" (expect `200`), and save. The test only proves the webhook is reachable; it does not read the booking feed.
5. Check for rejected bookings in the window: did `channex-webhook-rejected` fire, and does Channex → Bookings show a booking from that window that is not acknowledged? If so, import it: Domits → Channex diagnostics, logged in as that property's host → Pull latest Channex bookings. Check that it is acknowledged in Channex and stored in Domits (the S8 booking query).
6. Clear the values: `Remove-Variable new, stored, b; Set-Clipboard -Value " "`.

## Status

Executed on Wednesday 21 October 2026, about 13:20–15:10 UTC. Domits has used Channex production since then.

| Step | Result |
|---|---|
| S1 | Outbox empty before starting, checked again after the standup |
| S2 | Two connected staging accounts: the test host (disconnect endpoint) and an old test account nobody could log in to (database update by id) |
| S3 | Villa host added on `ChannelManagement` and `UnifiedMessaging`; the first attempt glued two ids together on `ChannelManagement` (one id in the list) and was repaired, which led to the `[string[]]` block above |
| S4 | `CHANNEX_BASE_URL=https://app.channex.io` on all four functions, each `Successful`, one variable more |
| S5 | Key "Domits Production" created under the owner account, only the villa; status `CONNECTED` |
| S6 | Mapping saved, readiness `Ready`; full sync 2026-10-21 → 2028-03-03, two task ids, Inventory matches Domits. The villa's availability period ends on 25 May 2027, so Channex shows it closed after that |
| S7 | Property webhook created; the first tests gave `401` until the header value was pasted again (found with the fingerprint check); then `200`. The `channex-webhook-rejected` alarm emailed on the `401`s |
| S8 | Price for 4 November changed and restored (two `PROCESSED` changes); test booking for 11–12 November stored (`Paid`, 550, 2 guests, source `Offline`), night closed, cancellation stored and night reopened |

After the switch, on 22 October 2026: staging webhook deactivated and the booking webhook secret rotated.

Known gaps found during the switch: the stored test booking did not show on the villa host's Reservations page, and only the guest's first name is stored (#3616).
