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
   ▼  "Are you sure?" → availability 0, wait a minute → status Disconnecting
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

Idempotent, also under a double click or two tabs: the first step claims the listing by writing its property mapping row with status `PROVISIONING`, under a unique key on `integrationAccountId` plus `domitsPropertyId` (the entity has none today, so a migration adds it). Not on `domitsPropertyId` alone: SiteMinder uses the same table (`integrationPropertyRepository`), and a listing may be mapped on both. Both requests of a double click come from the same host, so they use the same account row (D8) and still collide on this key. Before the migration, check the current rows for duplicates on these two columns; the index build fails if there are any. A second request at the same time fails on that key and gets "already in progress"; a later one finds the existing rows and creates nothing. Only after the claim does the backend call Channex. If a step fails halfway, the next attempt continues from the first missing object (each created id is stored before the next call).

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
| **Availability 0, wait, then disconnect (Channex's advice)** | Availability 0 on the room type for all dates reaches the OTA; about a minute later the channel is deactivated, so that OTA keeps 0. Then a full sync restores the real availability on the listing's other OTAs. | Yes |
| stop_sell on that one channel | Closes only that OTA, but Channex support advised availability 0 instead (18 Nov) | No |
| Deactivate at once | Stops the exchange without closing anything. The OTA keeps selling its last availability: dates booked elsewhere stay open there. Channex also stops sending changes to that OTA's existing bookings. | No: double-booking risk |
| Pause and stay connected | Works, but adds a paused state to keep in step | No: hosts who switch off mostly leave |

The flow:

```
Toggle OFF ─▶ "Are you sure?" ─▶ yes
   ▼ backend: row = DISCONNECTING, disconnectRequestedAt = now; availability 0 for the room type
     (the request returns at once)
   ▼ outbox worker holds this listing's ARI rows while any of its channels is DISCONNECTING
   ▼ worker run ≥ 1 minute later: deactivate the channel, row = DISCONNECTED
   ▼ release the held rows and queue a full sync: the other OTAs reopen with the real calendar
```

Accepted cost: the listing's other OTAs are closed for about two minutes while a disconnect runs. That can lose a booking attempt, never cause a double booking. Holding the outbox matters: a price or calendar change in those minutes would otherwise reopen the dates before the channel is deactivated.

Channex support (18 Nov) gave the order and the wait: availability 0, wait about a minute, then deactivate.

A disconnect that keeps failing must not keep the other OTAs closed: when deactivate still fails after the worker's retry limit (#3927), the row goes to `ERROR` ("Needs attention"), which ends the hold, and the full sync reopens the other OTAs.

The confirm text: "Booking.com will be disconnected. Your listing there will be closed for new bookings. Existing bookings stay valid, but changes to them will not reach Domits. To keep selling on Booking.com yourself, reopen your dates in the Booking.com extranet." For Airbnb and Vrbo the last sentence says "in your Airbnb calendar" / "in your Vrbo calendar". When the listing has upcoming bookings from that OTA (`booking_source`), the dialog adds "You have N upcoming bookings from Booking.com."

Deactivating inside Channex's own screen: Channex confirmed (18 Nov) that the iframe cannot hide its Deactivate button. A host who uses it skips the close step, so that OTA keeps selling the last calendar. Accepted, and the host is told before and during the connection:

- The connect checklist has one more checkbox for every OTA: "I will disconnect only with the switch on this page." Continue stays disabled until it is ticked.
- Under the Channex screen: "To disconnect, use the switch on the Distribution page. If you deactivate here, your listing stays open for sale on [OTA] and you must close your dates there yourself."
- Domits still detects it on the next refresh or reconciliation and shows "Needs attention: disconnected outside Domits", telling the host to close the dates in the OTA. Domits cannot close them once the channel is off.

Whether the checkbox moves responsibility to the host legally is for the terms of service, not this design. If it happens in practice, the follow-up is our own screens on the Channel API, as Channex recommends.

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
   ▼ start the D5 flow: row = DISCONNECTING, disconnectRequestedAt = now, availability 0
   ▼ the normal D5 step deactivates it after the wait
```

The same loop also releases held rows: a listing whose channels are no longer `DISCONNECTING` gets its outbox rows released and a full sync, so a failed disconnect never leaves the other OTAs closed.

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
| POST | `/host/listings/{propertyId}/channels/refresh` | After the iframe closes, and on Refresh: read the property's channels from Channex (`GET /channels?filter[property_id]=…`) and store or update the rows |
| POST | `/host/channels/{channelId}/disconnect` | Toggle off (D5) |

Responses never contain API keys or other hosts' data.

### Screens and states (for frontend and design)

Suggested pages were shared in the group chat on 18 Nov; Ilan owns the final design.

- Distribution page: listing picker, one card per OTA (Booking.com, Airbnb, Vrbo) with a switch and one of the D7 states (not connected, Syncing…, Live, Disconnecting…, Needs attention), a Refresh button, and a "Sync status" card (coming soon).
- Listing not ready (D3): one notice instead of the cards, saying what is missing.
- Timezone picker (D4): only for listings in a multi-timezone country, on the first switch.
- Connect checklist per OTA: the prerequisites as checkboxes (Booking.com: Channex chosen as connectivity provider; Airbnb: account owner, no other channel manager; Vrbo: not linked to another PMS, no iCal links), plus for every OTA "I will disconnect only with the switch on this page" (D5).
- Channex connection screen in a modal, with the D5 warning line under it; closing it calls `refresh`.
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

- Unit tests per route: owner check; D3 readiness; idempotent provisioning, including two requests at the same time creating one Channex property; the disconnect confirm data with and without upcoming bookings; a failed step resumes; disconnect sets availability 0 and never deactivates directly; the worker holds the listing's ARI rows while a channel is `DISCONNECTING`, deactivates only rows older than the wait, then releases the rows and queues a full sync; a deactivate that fails past the retry limit sets `ERROR` and releases the hold; reconnect resets every row sharing the secret; a listing-details save writes one outbox row only when distribution is on.
- D4 timezone: a single-zone country (Netherlands → `Europe/Amsterdam`); a multi-zone country without the host's choice is refused with "pick a timezone"; with the choice it is used; an unknown country is refused, not guessed.
- D7 labels as one pure function (row status, Channex active, waiting rows in; label out), table-tested like `evaluateChannexHealth` in `channexHealthStatus.js`, including "Disconnected outside Domits".
- D9 reconciliation: a listing that is not live with an active channel goes to `DISCONNECTING`; a live listing is left alone; held rows are released once no channel of the listing is `DISCONNECTING`; the cap per run holds.
- Before building D5: on the staging test property, with two test channels, set availability 0, wait a minute, deactivate one channel, run the full sync, and confirm the deactivated channel stays closed while the other reopens.
- Before releasing the iframe (D1): request a one-time token for property A, change the property in the iframe URL to property B, and confirm Channex refuses it.
- End to end on staging: the Booking.com test account (shared pool, connect late, test fast), an Airbnb test listing if available. Vrbo has no test account (D6): its first test is a real listing.

## 10. Open questions

- Q1. Channex support (sent 18 Nov): (a) can a one-time token be limited to one property: answered yes on 18 Nov (D1); (b) can the iframe hide its Deactivate button: no (D5); (c) how to close before deactivating: availability 0, wait about a minute (D5). All answered.

## 11. Order of work

1. This note reviewed by Rakib, Ilan and Stefan; Q1 sent to Channex support.
2. Staging test of the D5 close-then-disconnect order (section 9).
3. D3 readiness check, the unique key on the property mapping table (account plus listing, after a duplicate check), provisioning (D2), timezone (D4), account rows (D8), with tests.
4. Connect: `connect-session` and `refresh` (D1, D6, D7).
5. Worker time budget and row caps (#3927), before the worker gets new jobs.
6. Disconnect: route plus the worker step (D5), then the D9 reconciliation.
7. Listing edits through the outbox (D10).
8. Host health view (#2869).
