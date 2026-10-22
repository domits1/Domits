# Channex integration

For Domits developers and operators: how the integration is built and run. Connecting a listing to an OTA, without the internals: [Booking.com](../booking.com/README.md), [Airbnb](../airbnb/README.md).

Domits connects a host's listing to OTAs (Booking.com, Airbnb, Vrbo, Expedia and others) through [Channex](https://channex.io), a white-label channel manager. Domits sends prices, availability and restrictions to Channex; Channex passes them to the connected OTAs and sends their bookings back to Domits.

Status (October 2026): certified by Channex; Domits runs on Channex production since 21 October 2026 (see the [production switch runbook](./channex_production_switch_runbook.md)). One property is connected, no OTA channel is active yet.

Start here, then follow the links for detail:

| Document | What it explains |
|---|---|
| [ARI outbox design](./channex_ari_outbox_design.md) | How calendar changes are queued, batched, rate-limited and retried |
| [Booking webhook design](./channex_booking_webhook_design.md) | How bookings arrive, are verified, stored and acknowledged |
| [Production switch runbook](./channex_production_switch_runbook.md) | Switching between staging and production, connecting an OTA, alarms, rollback, rotating the webhook secret |
| [DSQL outbox runbook](./dsql_channex_ari_outbox_runbook.md) | Creating the outbox table in Aurora DSQL |
| [Booking.com](../booking.com/README.md), [Airbnb](../airbnb/README.md) | Connecting a listing to that OTA through Channex |

## The two flows

Prices, availability and restrictions out (ARI):

```text
host saves calendar ─┐
Domits booking ──────┼─▶ channex_ari_outbox ─▶ outbox worker ─▶ Channex API ─▶ OTAs
Channex booking ─────┘    (same transaction    (every minute,
                           as the change)       batched, ≤ rate limit, retries)
```

Bookings in:

```text
OTA ─▶ Channex ─▶ POST /webhooks/channex/bookings ─▶ secret checked ─▶ booking feed read with the host's key
                                                                        │
                       acknowledge in Channex ◀── booking stored ◀──────┘
                                                   + outbox row closes or reopens the dates
```

- A change and its outbox row are saved in one transaction, so a saved change always reaches Channex, and a host's save never waits for Channex.
- The webhook carries no booking data ("Send data" is off): Domits reads the booking from Channex with the host's own API key. A forged call can therefore not create a booking.
- A booking is acknowledged only after it is stored, so Channex keeps offering it until Domits has it.

## What is synchronised

| Domits | Channex | Direction |
|---|---|---|
| Availability (open or closed per date, including Domits and OTA bookings and the property's availability period) | availability | Domits → Channex |
| Nightly price (base price and date overrides) | rate | Domits → Channex |
| Minimum stay (per date or the property default) | min stay through | Domits → Channex |
| Maximum stay (per date or the property default, when above 0) | max stay | Domits → Channex |
| Stop sell, closed to arrival, closed to departure (per date) | stop sell, CTA, CTD | Domits → Channex |
| New, modified and cancelled bookings, with the OTA amount, guest count and source | booking | Channex → Domits |

Not synchronised: minimum advance reservation, maximum nights per year, preparation time, occupancy-based pricing, taxes, listing content (photos, descriptions, amenities). Source: `utils/channexAriPayloadUtils.js`.

## Where the code lives

All Channex code is shared in `backend/functions/.shared/channelManagement/` and bundled into the Lambdas that need it.

| Part | Files |
|---|---|
| HTTP routes, access checks | `handler/channelManagementHandler.js`, `controller/channelManagementController.js` |
| Channex API client | `providers/channex/providerClient.js` (address from `CHANNEX_BASE_URL`) |
| API keys | `providers/channex/credentialStore.js` (Secrets Manager, one secret per Domits user) |
| Connect, disconnect, status | `channelManagementService.js` |
| Mapping (Domits listing ↔ Channex property, room type, rate plan) | `services/channexMappingService.js` (only the property's owner may map it) |
| Outbox: writing | `services/channexAriOutboxWriter.js`, called from PropertyHandler (prices, calendar, restrictions), the Bookings Lambda and the booking import |
| Outbox: sending | `services/channexAriOutboxWorker.js`, `utils/channexAriOutboxPlanning.js`, `services/channexAriPayloadService.js` |
| Full sync (go-live, manual) | `services/channexFullSyncService.js` |
| Booking webhook and import | `providers/channex/webhookSecretVerifier.js`, `services/channexBookingWebhookService.js`, `services/channexBookingRevisionImportService.js`, `repositories/channexExternalBookingImportRepository.js` |
| Polling (backup, off) | `services/channexBookingPollingService.js` |
| Sync evidence | `repositories/channexSyncEvidenceRepository.js` |
| Admin page (web) | `frontend/web/src/features/hostdashboard/channexadmin/`, `hostintegrations/ChannexDiagnosticsPanel.jsx` |

## Configuration

Lambdas with Channex code: `ChannelManagement`, `UnifiedMessaging`, `General-Bookings-CRUD-Bookings-develop`, `PropertyHandler`. The outbox worker and the booking webhook run in `ChannelManagement`; the worker is started every minute by EventBridge.

| Setting | Where | Purpose |
|---|---|---|
| `CHANNEX_BASE_URL` | all four Lambdas | `https://app.channex.io` (production) or `https://staging.channex.io` (default) |
| `CHANNEX_CERTIFICATION_USER_IDS` | ChannelManagement, UnifiedMessaging | Domits user ids allowed on the admin page and its endpoints, including connect, disconnect and mapping |
| `CHANNEX_BOOKING_POLL_*` | ChannelManagement, UnifiedMessaging | Booking polling as a backup; off (#3576) |
| `domits/channex/...` | Secrets Manager | One API key per Domits user |
| `domits/channex/webhook/bookings` | Secrets Manager | Webhook secret, JSON `{"webhookSecret": "..."}`, sent by Channex in header `X-Channex-Webhook-Secret` |

Data lives in Aurora DSQL, schema `main`: `channel_integration_account` (one per Domits user and channel), `channel_integration_property`, `channel_integration_room_type`, `channel_integration_rate_plan` (the mapping), `channex_ari_outbox`, `channex_sync_evidence`, `channex_booking_revision`, and the bookings themselves in `booking` with `bookingtype = 'channex'`.

## Operating it

- Alarms: five CloudWatch alarms email the `channex-alerts` topic on failed changes, rejected or failing webhooks, and ChannelManagement errors or throttles. What each means and what to do: [runbook, Alarms](./channex_production_switch_runbook.md#alarms).
- Admin page (Domits → Channex diagnostics, allowlisted users only): connection status, mapping, latest sync evidence with Channex task ids, full sync.
- Checking a sync: the evidence shows the date range and task ids; the outbox shows each change and its status:

  ```sql
  SELECT kind, changetypes, source, status, datefrom, dateto, attemptcount, failurereason
  FROM main.channex_ari_outbox
  WHERE domitspropertyid = '<domits property id>'
  ORDER BY createdat DESC
  LIMIT 10;
  ```

- Connecting a listing to an OTA takes about 30–60 minutes per property per OTA, partly done by the host: [runbook, Connecting an OTA](./channex_production_switch_runbook.md#connecting-an-ota-after-the-switch).

## Troubleshooting

Problems seen so far, and where to look first:

| Symptom | Likely cause | Check |
|---|---|---|
| A calendar change does not reach Channex | Saved value equal to the old one (no change is queued), or the account is not `CONNECTED` | Outbox query above; admin page → Overview |
| A change is `FAILED` in the outbox, alarm `channex-outbox-rows-failed` | Channex rejected it, or 8 attempts failed | `failurereason` in the outbox; ChannelManagement logs, line `CHANNEX_ARI_OUTBOX_ROWS_FAILED` |
| Dates show as closed in Channex while open in Domits | The dates are outside the property's availability period | `main.property_availability` for the property |
| A booking does not arrive in Domits | Webhook inactive or wrong secret (alarm `channex-webhook-rejected`), or booked on an unmapped room or rate | Channex → Webhooks; the booking's room and rate in Channex |
| A booking is stored but not on the Reservations page | The page loads only 12 of a host's properties | `main.booking` with `bookingtype = 'channex'` |
| Webhook test returns `401` | The header value differs from the secret | Fingerprint check in the [runbook, S7](./channex_production_switch_runbook.md#s7-production-booking-webhook) |
| Connect or mapping returns `403` | The user is not on `CHANNEX_CERTIFICATION_USER_IDS` | Allowlist on ChannelManagement and UnifiedMessaging |
| Mapping refused with `CHANNEX_MAPPING_PROPERTY_NOT_OWNED` | Logged in as someone other than the property's host | Log in as the host |
| Prices on the OTA differ from Domits | Changed in the OTA itself; Domits overwrites a date only when it changes in Domits | Change it in Domits, or run a full sync |
| Vrbo shows other prices or availability | An iCal connection on the Vrbo listing overwrites what Channex sends | Remove iCal on Vrbo |

## Known limitations

| Limitation | Effect | Issue |
|---|---|---|
| One room type and one rate plan per property | A host with several units or prices in one Channex property cannot be fully mapped; bookings on unmapped rates do not arrive | #3568 |
| No listing creation or content push | Photos, descriptions, amenities and house rules are managed on the OTA itself. Channex itself does not support this yet (planned for Booking.com and Airbnb in 2027, not guaranteed) | — |
| Existing future bookings are not imported | Before a channel is activated, the host must block those dates in the Domits calendar | #3582 |
| Only the guest's first name is stored | Channex sends name and surname separately | #3616 |
| Booking currency and cancellation date of imported bookings | Open bugs in how they are stored | #3583, #3585 |
| Reservations page loads only 12 of a host's properties | Bookings on the other properties are stored but not shown | issue from 22 Oct 2026 |
| Webhook only, no polling backup | A missed webhook means a missed booking until it is fetched manually | #3576 |
| Webhook deliveries are not signed | The shared secret header is the only check; HMAC signing is available in Channex | #3574 |
| Dates outside the availability period | Sent as closed; Channex shows them as unavailable | by design |

## History

| Issue | What |
|---|---|
| #440, #2266 | Channel manager parent issues |
| #3278 | ARI outbox |
| #3281 | Booking webhook |
| #3282 | Full sync on go-live |
| #2861 | Channex certification and production |
| #3620 | Monitoring and alarms |
