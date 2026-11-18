# Host self-distribution through Channex: design note

| | |
|---|---|
| Issue | #506 (Distribution tab), capability #440 |
| Related | #2869 (host health view), #3564 (follow-ups), #3278 (ARI outbox), #3494 (full sync), #3365 (owner checks), #3921 (listing create not atomic) |
| Author | Enes Veli Yigit |
| Roles | Design: Ilan · Frontend: Rakib · Backend: Enes |
| Status | Design, for review. Nothing built. |
| Date | 18 November 2026 |

## 1. Summary

A host connects their existing Booking.com, Airbnb and Vrbo listings to Domits from the Distribution tab, without help from the team. One toggle per OTA: on connects, off closes the listing on that OTA and then disconnects it.

Domits stays the source of prices and availability. When a host turns on distribution for a live listing, the backend creates the Channex side of that listing (property, room type, rate plan) under Domits' Channex account and gives the host an account row that points to Domits' key (D8). The host connects each OTA in the Channex connect screen (iframe) shown inside Domits (D1).

```
Host: "Turn on distribution" (live listing, D3)
   ▼  backend creates Channex property, room type, rate plan (D2), account row (D8)
   ▼  full sync: 500 days of prices and availability to Channex
Host: toggle ON for an OTA
   ▼  Channex iframe for this listing: Booking.com, Airbnb or Vrbo connect
   ▼  iframe closes → backend reads the property's channels from Channex, stores them
Host: toggle OFF
   ▼  "Are you sure?" → close all dates on that OTA (stop_sell) → status Disconnecting
   ▼  outbox worker deactivates the channel after the close has synced → Disconnected
```

## 2. Problem

Today every connection is made by the team on the internal admin page: we create or pick a Channex property, map it to the Domits listing, add the OTA channel in Channex and activate it. That takes 30 to 60 minutes per listing per OTA and does not grow with the number of hosts. Stefan's goal is self-service for the three largest OTAs: Booking.com, Airbnb and Vrbo.

What a host must understand before connecting, because no button can change it:

- **The listing must already exist on the OTA.** Channex cannot create OTA listings or send content (photos, descriptions, amenities). Its own roadmap names listing creation for Booking.com and Airbnb in 2027, not as a promise.
- After connecting, prices, availability, restrictions and bookings sync. Content stays in the OTA's own extranet.

## 3. Goals and non-goals

Goals:

- G1. A host turns on distribution for a live listing; the Channex side is created and filled with the listing's prices and availability.
- G2. A host connects Booking.com, Airbnb and Vrbo from the Distribution tab.
- G3. A host switches one OTA off; the listing closes on that OTA before it is disconnected, so it is never sold on stale availability.
- G4. A host never sees or changes another host's listings, channels or bookings. For the iframe this rests on the token being limited to one property (D1), verified on staging before release.
- G5. The host always sees the state of each OTA connection (D7).

Non-goals (this design):

- Other OTAs, multiple room types or rate plans per listing (#3568), content sync, creating OTA listings.
- Pausing an OTA while staying connected. Off means disconnect (D5).
- The host health view (#2869 next slice): it reads the same tables; its design follows this note.

## 4. What already exists and is reused

| Part | Where | Use here |
|---|---|---|
| Domits' Channex account and its key, connected in production since 21 Oct | `channel_integration_account`, secret behind `credentialsRef` | Every Channex object is created under it; host rows point to the same secret (D8) |
| Account lookup per user | `findByUserIdAndChannel` in mapping (`channexMappingService.js:102`), ARI execution (`channexAriExecutionService.js:110`), booking bridge | Keeps working unchanged because every host gets an account row (D8) |
| Owner check on mappings | `checkPropertyOwner`, #3365 | Applies as is: the host owns both the listing and their account row |
| Mapping tables listing ↔ Channex property, room type, rate plan | `ChannelIntegrationProperty`, `ChannelIntegrationRoomType`, `ChannelIntegrationRatePlan` | Provisioning writes the same rows the admin page writes, so the outbox, worker, webhook and polling work unchanged |
| Full sync (500 days) | #3494, `channexFullSyncService.js` | Fills a new Channex room type, which Channex creates with availability 0 |
| ARI outbox, worker every minute | #3278, `channexAriOutboxWriter`, `channexAriOutboxWorker.js` | Keeps prices and availability in sync; also runs the delayed disconnect (D5) and the listing-details update (D10) |
| PropertyHandler already writes to the outbox | `propertyPricingRepository.js`, `propertyCalendarOverrideRepository.js`, `propertyAvailabilityRestrictionRepository.js` | The listing-details writer (D10) follows the same pattern |
| Channex client | `providers/channex/providerClient.js` | Today it reads room types and rate plans; create, update, one-time token and channel calls are new |

## 5. Decisions

### D1. Channex iframe, with the one-time token limited to the listing's property

| Option | For | Against |
|---|---|---|
| **Channex iframe (chosen)** | Least work. Channex's own connect screens for all three OTAs. The Vrbo password goes into Channex's screen, never through Domits (D6). | The session belongs to Domits' account, which holds every host's property, so its scope rests entirely on the token's `property_id` (below). |
| Own form on the Channel API | The host never gets a Channex session; the backend makes every call after the owner check | More work for Ilan, Rakib and Enes; Vrbo's password would pass through Domits |

Scope of the session: Channex support confirmed on 18 Nov that the one-time token is requested with a `property_id` (`POST /api/v1/auth/one_time_token`) and that the iframe session is limited to that property. `connect-session` therefore always requests the token for the host's own Channex property, after the owner check, and never takes a property id from the browser.

Verification before release (section 9): with a token for property A, change the property in the iframe URL to property B and confirm Channex refuses it. If it does not, the iframe is not released and we build our own form on the Channel API (`test_connection`, `mapping_details`, `POST /channels`, mappings, `activate`).

No extra allowlist on `connect-session` meanwhile: there are no real hosts yet, and the check above runs during testing, before any host is onboarded.

### D2. Provisioning: create the Channex side when the host turns on distribution

When the host turns on distribution for a listing that passes D3, the backend creates, in this order:

| Channex object | Fields | From Domits |
|---|---|---|
| Property | `title`, `currency`, `property_type`, timezone, address, coordinates, email, phone | Listing title; `EUR`; property type (villa → `villa`, apartment → `apartment`, otherwise `holiday_home`); `property_location`; host contact; timezone from D4 |
| Room type | `title`, `count_of_rooms: 1`, `occ_adults`, `occ_children: 0`, `occ_infants: 0`, `default_occupancy` | Listing title; max guests for `occ_adults` and `default_occupancy` |
| Rate plan | `title: "Standard Rate"`, `room_type_id`, `options: [{ occupancy, is_primary: true }]` | Occupancy = max guests |

Then it writes the host's account row if there is none (D8), the three mapping rows, and queues a full sync. Channex's defaults for `allow_availability_autoupdate_on_modification` and `..._on_cancellation` stay off, as Channex recommends for a PMS that pushes availability itself.

Idempotent, also under a double click or two tabs: the first step claims the listing by writing its property mapping row with status `PROVISIONING`, under a unique key on `domitsPropertyId` (the entity has none today, so a migration adds it). A second request at the same time fails on that key and gets "already in progress"; a later one finds the existing rows and creates nothing. Only after the claim does the backend call Channex. If a step fails halfway, the next attempt continues from the first missing object (each created id is stored before the next call).

Cost: Channex bills a vacation rental at $0.50 per unit per month, only once the property has an active channel. Creating it ahead costs nothing.

### D3. Only live, complete listings can turn on distribution

A listing can turn on distribution when:

- its status is ACTIVE (approved by the listing review, #3302), and
- it has a location row, a max guests value and a price.

Otherwise the tab shows what is missing ("Publish your listing first", "Add the address"). Reason: drafts must not be sold on an OTA before Domits' own review, and listings without a location row exist (#3921); provisioning would fail halfway on them.

### D4. Timezone: from the country, the host picks only where a country has several

Channex needs a timezone per property; Domits stores none. The backend derives it from the listing's country. For countries with several timezones (United States, Canada, Australia, Brazil, Mexico, Indonesia, Russia, and Spain, Portugal, Chile and Ecuador because of the Canary Islands, the Azores and Madeira, Easter Island and the Galápagos), the host picks one when turning on distribution. No change to the listing form or the database for other hosts.

### D5. Toggle off closes the listing on that OTA first, then disconnects

| Option | Effect | Chosen |
|---|---|---|
| **Close, then disconnect** | `PUT /channels/{id}` with `settings.derived_option.stop_sell = [["set", true]]`. Updating an active connection triggers a full sync, so all dates close on that OTA only. After the close has synced, the channel is deactivated. | Yes |
| Deactivate at once | Stops the exchange without closing anything. The OTA keeps selling its last availability: dates booked elsewhere stay open there. Channex also stops sending changes to that OTA's existing bookings. | No: double-booking risk |
| Pause with stop_sell and stay connected | Works, but adds a paused state to keep in step | No: hosts who switch off mostly leave |

The flow:

```
Toggle OFF ─▶ "Are you sure?" ─▶ yes
   ▼ backend: stop_sell on that channel, row = DISCONNECTING (the request returns at once)
   ▼ outbox worker, every minute: DISCONNECTING for more than 15 min? ─▶ deactivate, row = DISCONNECTED
```

The confirm text: "Booking.com will be disconnected. Your listing there will be closed for new bookings. Existing bookings stay valid, but changes to them will not reach Domits. To keep selling on Booking.com yourself, reopen your dates in the Booking.com extranet." For Airbnb and Vrbo the last sentence says "in your Airbnb calendar" / "in your Vrbo calendar". When the listing has upcoming bookings from that OTA (`booking_source`), the dialog adds "You have N upcoming bookings from Booking.com."

If the host deactivates the channel inside Channex's own screen instead (Q1b: can that button be hidden), stop_sell is skipped. Domits notices it on the next refresh or reconciliation and shows "Needs attention: disconnected outside Domits", telling the host to close the dates in the OTA themselves. Domits cannot close them once the channel is off.

The 15 minutes is a first guess. The staging test (section 9) measures how long the close takes, and the number is set from that.

Toggle on runs the connect flow (D1). A host who comes back connects again.

### D6. Vrbo is in the first version

With the iframe, the host types the Vrbo username, password and SMS code into Channex's screen, so Domits never handles them. The Vrbo limits the tab must explain:

- An account that was linked to another PMS must first be converted back by Vrbo support.
- Any iCal connection on the Vrbo listing must be removed first, including a Domits iCal export, because it can overwrite what Channex sends.
- The connection drops when the host changes the Vrbo password. Domits shows this as "Disconnected outside Domits" (D7).
- Channex documents no Vrbo test account or sandbox, so the first Vrbo connection can only be tested with a real Vrbo listing.

### D7. State and what the host sees

One new table, `channel_integration_channel`, one row per host OTA connection: `id`, `integrationPropertyId`, `domitsPropertyId`, `hostId`, `channexChannelId`, `otaCode` (`BookingCom`, `Airbnb`, `Vrbo`), `status` (`ACTIVE`, `DISCONNECTING`, `DISCONNECTED`, `ERROR`), `lastErrorCode`, `disconnectRequestedAt`, `createdAt`, `updatedAt`. Quoted camelCase columns, like the other `channel_integration_*` tables.

Channex stays the source of truth for whether a channel is active. The tab reads the channel state when it opens and when the host clicks Refresh; there is no automatic polling, so an open tab puts no load on the Lambda (same rule as the health view).

| Shown to the host | When |
|---|---|
| Syncing… | Channel active and outbox rows for this listing are still waiting |
| Live | Channel active and nothing waiting |
| Disconnecting… | Row is `DISCONNECTING` |
| Disconnected | Row is `DISCONNECTED` |
| Needs attention | Row is `ERROR`, or Channex reports the channel inactive while our row says `ACTIVE` ("Disconnected outside Domits", for example after a Vrbo password change or the iframe's own deactivate button) |

### D8. One account row per host, all pointing to Domits' key

Context: the existing code finds the Channex account per user (`findByUserIdAndChannel`) and only lets the listing's owner save a mapping (#3365). Today the same user owns both the account and the production villa, so it works. A real host has no account row and could not be connected.

| Option | For | Against |
|---|---|---|
| **An account row per host, `credentialsRef` pointing to Domits' one secret (chosen)** | Mapping, worker, webhook, polling and the health view keep working unchanged; one secret, so rotating the key stays one change | A rejected key marks each row on its own next failing call. Reconnecting after a key fix must reset every row that shares the secret |
| One platform row, lookups changed to "the Domits account plus an owner check" | One row | Changes 5 or more lookups in live code; the meaning of #3365 changes |

Extra build step from this decision: reconnect resets all account rows with the same `credentialsRef`.

### D9. A listing that stops being live is disconnected everywhere

Live means status ACTIVE. Not live: INACTIVE, ARCHIVED, REJECTED, PENDING_REVIEW. Editing a live listing does not change its status: a submit for review only starts from INACTIVE, REJECTED or ARCHIVED (`SUBMITTABLE_FOR_REVIEW_STATUSES` in `PropertyHandler/util/propertyStatus.js`), so a normal edit never disconnects anything.

When a listing leaves ACTIVE (the host deactivates or archives it, or an admin rejects it), every connected OTA goes through the D5 flow: close, then disconnect. A listing that comes back is connected again by the host. Reason: an archived listing must never stay for sale on an OTA, and one flow is simpler than a paused state.

How it is noticed: reconciliation in the outbox worker, not an event from PropertyHandler. Status is written in more than one place (`propertyRepository.updatePropertyStatus`, called for status changes and for archiving, and a second compare-and-swap update in the same repository), and a missed path would leave an archived listing for sale without any symptom. Every minute the worker compares the two states and repairs the difference:

```
channel row ACTIVE  AND  listing status ≠ ACTIVE
   ▼ set stop_sell, row = DISCONNECTING, disconnectRequestedAt = now
   ▼ the normal D5 step deactivates it after the wait time
```

The same loop also catches the opposite leftover from D5: a channel that is active in Channex, still carries stop_sell, and belongs to a live listing (for example, an old channel re-activated in the iframe). It removes the rule.

Each job in the worker has its own cap per run (for example, 10 channels); the rest wait for the next minute, so price syncing never waits behind it (#3927).

### D10. Listing edits reach Channex through the outbox

When a host saves a listing with distribution on and the title, address, max guests or property type changed, PropertyHandler writes one outbox row of a new kind, `LISTING_DETAILS`, in the same save. The worker updates the Channex property, room type and rate plan. The host's save never waits for Channex or fails because of it; a failed update follows the existing retry and back-off and shows in the health view.

Open for the build step: outbox rows are built around date ranges today, so the new kind needs a row-kind column or nullable dates.

## 6. Routes for the Distribution tab

All under `/integrations/channex/host/...`, Cognito-authenticated. Every route checks that the listing or channel belongs to the signed-in host. None is behind the admin allowlist.

| Method | Path | Does |
|---|---|---|
| GET | `/host/listings` | The host's listings with distribution status, D3 readiness and channels (D7) |
| POST | `/host/listings/{propertyId}/distribution` | Turn on: D3 check, provisioning (D2), account row (D8). Idempotent. Body carries the timezone only where D4 needs it |
| POST | `/host/listings/{propertyId}/connect-session` | A one-time token and iframe URL for this listing's Channex property. The frontend calls `refresh` whenever the modal closes, whether or not Channex sends a message when the host finishes |
| POST | `/host/listings/{propertyId}/channels/refresh` | After the iframe closes, and on Refresh: read the property's channels from Channex (`GET /channels?filter[property_id]=…`) and store or update the rows. An active channel that still carries stop_sell from an earlier disconnect gets the rule removed |
| POST | `/host/channels/{channelId}/disconnect` | Toggle off (D5) |

Responses never contain API keys or other hosts' data.

### Screens and states (for frontend and design)

Suggested pages were shared in the group chat on 18 Nov; Ilan owns the final design.

- Distribution page: listing picker, one card per OTA (Booking.com, Airbnb, Vrbo) with a switch and one of the D7 states (not connected, Syncing…, Live, Disconnecting…, Needs attention), a Refresh button, and a "Sync status" card (coming soon).
- Listing not ready (D3): one notice instead of the cards, saying what is missing.
- Timezone picker (D4): only for listings in a multi-timezone country, on the first switch.
- Connect checklist per OTA: the prerequisites as checkboxes (Booking.com: Channex chosen as connectivity provider; Airbnb: account owner, no other channel manager; Vrbo: not linked to another PMS, no iCal links).
- Channex connection screen in a modal; closing it calls `refresh`.
- Disconnect confirm (D5), with the upcoming-bookings line when there are any.
- Setup failed halfway (D2): "Something went wrong while setting up. Try again." The next attempt resumes.

## 7. Security

- Domits' Channex API key stays in the backend. The host only gets a one-time token for the iframe.
- `connect-session` only returns a token for a listing the host owns.
- The one-time token is requested per property; the cross-property check before release: D1.
- Every route resolves the listing owner from the database and compares it with the token's user, as the existing owner checks do.
- Domits never handles OTA passwords: Vrbo credentials go into Channex's screen (D6).

## 8. Platform limits

- Channex rate limits: 10 availability and 10 rate or restriction calls per minute per property. A full sync after provisioning or a toggle uses 2 calls for that property. Limits are per property, so hosts connecting at the same time do not share them.
- Lambda: the routes run behind the existing `/integrations/channex/{proxy+}` resource, which goes to the UnifiedMessaging Lambda (found for the health view, #2869), so no new API Gateway resource is needed. Each route makes a few sequential calls, well inside the Lambda timeout; the slow parts (full sync, delayed disconnect, listing-details update) run in the outbox worker.
- Aurora DSQL: each route writes a handful of rows; no large transactions.

## 9. Testing and verification

- Unit tests per route: owner check; D3 readiness; idempotent provisioning, including two requests at the same time creating one Channex property; the disconnect confirm data with and without upcoming bookings; a failed step resumes; disconnect sets stop_sell and never deactivates directly; the worker deactivates only rows `DISCONNECTING` for more than the wait time; reconnect resets every row sharing the secret; `refresh` removes a leftover stop_sell from an active channel; a listing-details save writes one outbox row only when distribution is on.
- D4 timezone: a single-zone country (Netherlands → `Europe/Amsterdam`); a multi-zone country without the host's choice is refused with "pick a timezone"; with the choice it is used; an unknown country is refused, not guessed.
- D7 labels as one pure function (row status, Channex active, waiting rows, stop_sell in; label out), table-tested like `evaluateChannexHealth` in `channexHealthStatus.js`, including "Disconnected outside Domits".
- D9 reconciliation: a listing that is not live with an active channel goes to `DISCONNECTING`; a live listing is left alone; a live listing's active channel with a leftover stop_sell gets it removed; the cap per run holds.
- Before building D5: on the staging test property, set stop_sell on the Booking.com test channel, time how long until all dates show closed on that channel only, then deactivate and confirm they stay closed. That sets the wait time. Also check whether the iframe re-activates a deactivated channel or creates a new one.
- Before releasing the iframe (D1): request a one-time token for property A, change the property in the iframe URL to property B, and confirm Channex refuses it.
- End to end on staging: the Booking.com test account (shared pool, connect late, test fast), an Airbnb test listing if available. Vrbo has no test account (D6): its first test is a real listing.

## 10. Open questions

- Q1. Channex support (sent 18 Nov): (a) can a one-time token be limited to one property: answered yes on 18 Nov (D1); (b) can the iframe hide its Deactivate button; (c) does a queued sync still go out after a channel is deactivated? (b) and (c) still open.

## 11. Order of work

1. This note reviewed by Rakib, Ilan and Stefan; Q1 sent to Channex support.
2. Staging test of stop_sell and its timing (section 9).
3. D3 readiness check, the unique key on the property mapping table, provisioning (D2), timezone (D4), account rows (D8), with tests.
4. Connect: `connect-session` and `refresh` (D1, D6, D7).
5. Worker time budget and row caps (#3927), before the worker gets new jobs.
6. Disconnect: route plus the worker step (D5), then the D9 reconciliation.
7. Listing edits through the outbox (D10).
8. Host health view (#2869).
