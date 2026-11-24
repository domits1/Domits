# SiteMinder pmsXchange (#603)

Domits acts as the PMS. pmsXchange is SiteMinder's API for that: Domits sends ARI (availability, restrictions, rates) to SiteMinder, and SiteMinder delivers reservations to Domits.

Docs: https://developer.siteminder.com/pmsxchange-api

## What is built

| Part | File | Direction | Protocol |
| ---- | ---- | --------- | -------- |
| Rooms and Rates (room types and rate plans of a hotel) | `data/siteMinderRestClient.js`, `util/roomRates.js` | SiteMinder -> Domits | REST/JSON |
| SOAP transport (envelope, login, answer, retryable or not) | `data/siteMinderSoapClient.js`, `util/otaXml.js` | both | SOAP 1.1 |
| Availability | `util/availabilityMessage.js`, `business/siteMinderAvailabilityPusher.js` | Domits -> SiteMinder | `OTA_HotelAvailNotifRQ` |
| Restrictions (stop sell, CTA, CTD, min/max stay) | `util/restrictionsMessage.js`, `business/siteMinderRestrictionsPusher.js` | Domits -> SiteMinder | `OTA_HotelAvailNotifRQ` |
| Rates (Per Day Pricing) | `util/ratesMessage.js`, `business/siteMinderRatesPusher.js` | Domits -> SiteMinder | `OTA_HotelRateAmountNotifRQ` |
| Mapping | `business/siteMinderMappingService.js` | - | shared tables |
| Checked sending | `business/siteMinderInventoryService.js` | Domits -> SiteMinder | - |
| Reading reservations | `util/reservationsMessage.js` | SiteMinder -> Domits | `OTA_ResRetrieveRS` |
| Asking for, confirming and failing reservations | `util/reservationsMessage.js`, `business/siteMinderReservationsReader.js` | both | `OTA_ReadRQ`, `OTA_NotifReportRQ` |
| Saving reservations as Domits bookings | `util/reservationBookings.js`, `business/siteMinderReservationImporter.js` | SiteMinder -> Domits | shared booking import |
| One reservations run: read, save, confirm or fail | `business/siteMinderReservationSync.js` | both | `OTA_ReadRQ`, `OTA_NotifReportRQ` |

Not built yet: the Lambda handler and schedule, and the host screen.

## Receiving reservations

Domits pulls reservations, it does not get them pushed. Pull fits what is already here: the same SOAP client and WS-Security login, and a schedule like the Truvi Lambda. Push would need a public SOAP endpoint in API Gateway. Source: [Reservations Pull](https://developer.siteminder.com/pmsxchange-api/reference/reservations/pull.md).

1. Every 2 to 5 minutes (SiteMinder allows nothing outside that range), Domits sends `OTA_ReadRQ` with `SelectionType="Undelivered"`.
2. SiteMinder answers `OTA_ResRetrieveRS` with zero or more reservations. Each one is `Book`, `Modify` or `Cancel`.
3. Domits creates, changes or cancels the booking.
4. Domits confirms with `OTA_NotifReportRQ`: saved reservations in one message, failed ones with an `Errors` block in another. SiteMinder does not allow both in one message.
5. Domits sends the new availability with `OTA_HotelAvailNotifRQ`.

A reservation that is not confirmed comes back on the next `OTA_ReadRQ`. After 20 reads, or one hour after the first delivery, SiteMinder marks it failed and emails the hotel. That is a fail-safe, not a retry plan: a reservation Domits cannot save must be reported as failed.

`readReservations` reads only what Domits needs from each reservation:

| Field | From |
| ----- | ---- |
| `status` | `@ResStatus` (`Book`, `Modify`, `Cancel`) |
| `siteMinderId` | `UniqueID Type="14"`, the same for every change of the reservation |
| `messageId` | `UniqueID Type="16"`, needed to confirm this delivery |
| `createdAt`, `lastModifiedAt` | `@CreateDateTime` (Book) and `@LastModifyDateTime` (Modify, Cancel), as sent |
| `hotelCode` | `ResGlobalInfo/BasicPropertyInfo`, else the first room |
| `channel` | the primary `BookingChannel`, for example `EXP` Expedia |
| `rooms` | per `RoomStay`: room type, every rate plan, arrival and departure, adults, children and infants, and the room total. Room type and rate plans are empty when SiteMinder has no mapping for them |
| `guest` | the primary guest: first and last name, email and the first phone number |
| `total` | `ResGlobalInfo/Total`, which SiteMinder calls the total for the whole reservation |

`SiteMinderReservationsReader` (in `createSiteMinderServices` as `reservations`) has three calls:

| Call | Sends | Notes |
| ---- | ----- | ----- |
| `readUndelivered()` | `OTA_ReadRQ` for the whole PMS (`RequestorID` = `SITEMINDER_PMS_CODE`, no `HotelCode`) | SiteMinder asks for one level only, and ARI already works per PMS. Returns what `readReservations` returns: the reservations and how many were skipped |
| `confirm(reservations)` | one `OTA_NotifReportRQ` with `<Success/>` | per reservation: status, message id, the Domits booking id as `ResID_Value` (`ResID_Type="14"`), and the time Domits saved it (`CreateDateTime` for `Book`, `LastModifyDateTime` for `Modify` and `Cancel`). Sends nothing when the list is empty |
| `reportFailure(reservation, error)` | one `OTA_NotifReportRQ` with `<Errors>` and that one reservation, without a booking id | the error type and code come from SiteMinder's error tables. The text is cut to 200 characters and must not contain guest data, because the hotel can see it |

Each call has its own `EchoToken`. A refused or failed call throws `SiteMinderSoapError`, like the ARI calls.

`readReservations` never reads `Guarantee` or `PaymentCard`, so card details do not end up in Domits even when a channel sends them. A reservation without a SiteMinder id or message id can be neither saved nor confirmed, so it is skipped and counted in `skipped`; the other reservations in the same answer are still read. A response with a `DOCTYPE` is refused.

## Saving reservations

`SiteMinderReservationSync.run()` does steps 1 to 4 above. `reservationSync` in `createSiteMinderServices` builds it. Nothing calls it on a schedule yet.

Every room of a reservation becomes one Domits booking, because one SiteMinder room type is one Domits property (see Mapping). The bookings are written by the shared `ChannexExternalBookingImportRepository` with `SITEMINDER_BOOKING_PROFILE`: host name `SiteMinder`, booking type `siteminder`, guest id `SITEMINDER_GUEST:<room key>` and payment id `SITEMINDER:<room key>`.

| Thing | Value |
| ----- | ----- |
| Room key | `<siteMinderId>:<roomTypeCode>:<n>`, where `n` counts rooms of the same room type in the reservation. It does not depend on the room order, so a later change finds the same room |
| Domits booking id | `buildDeterministicBookingId("SITEMINDER", <account id>, <room key>)`, so saving the same room again never makes a second booking |
| Reservation link | one `channel_reservation_link` row per reservation (`externalReservationId` = `siteMinderId`) with the room keys in `rawPayload`. A change or cancel reads the rooms from here, so it still finds them after the host unlinked a room type |
| Booking id sent to SiteMinder | the booking of the first room. A cancel for a reservation Domits never saved is confirmed with the deterministic id of the reservation itself |
| Guest | first and last name of the primary guest, else `SiteMinder guest`. Email and phone are not saved |
| Guests | adults plus children of the room, or 1 when both are 0 |
| Price | the room total after tax, else before tax, only when it is in `SITEMINDER_CURRENCY`. Another currency saves no price rather than a wrong one |
| Source | the booking channel name, else its code, else `SiteMinder` |

| Status | What Domits does |
| ------ | ---------------- |
| `Book` | saves every room. A room that already exists (the same reservation delivered again) is updated, not saved twice |
| `Modify` | updates the rooms that exist, saves new rooms, and cancels rooms that are no longer in the reservation. A change for a reservation Domits never saved is saved as new |
| `Cancel` | cancels every room in the reservation link. A room that is already cancelled is left alone |

A change keeps a booking on the Domits property it was saved on, also when its room type was linked to another property since; the nights change on that same property. A room that an earlier change removed and a later change adds back is booked again.

Every save, change and cancel also writes a `SITEMINDER_IMPORT` row to the Channex ARI outbox in the same transaction: the new nights close and the old nights open again on Channex. `SITEMINDER_IMPORT` is urgent like `CHANNEX_IMPORT`, so it skips the quiet period. A property without a Channex mapping is skipped by the worker (`NOT_MAPPED`).

Everything is checked before anything is written. A reservation Domits can never save is reported to SiteMinder with a fixed text (no guest data), and nothing is saved:

| Problem | Type | Code | Text |
| ------- | ---- | ---- | ---- |
| The hotel is not linked to a Domits host through SiteMinder | 3 | 392 | Hotel is not linked to a Domits host |
| A room type is not linked, its link is turned off, or its Domits property no longer exists | 3 | 402 | Room type is not linked to a Domits property |
| No rooms, a room without a room type, or no valid stay (departure must be after arrival) | 3 | 321 | Reservation has no rooms or no valid stay dates |

Type 3 is the OTA type "Biz rule", and the codes come from SiteMinder's [error codes](https://developer.siteminder.com/pmsxchange-api/additional-resources/reference-tables/error-codes). Check them in the certification.

Any other error, for example the database, is not reported. The reservation stays unconfirmed and comes back on the next read. The run logs `SITEMINDER_RESERVATION_RETRY_LATER` with the message id, status and error code or name, and at the end `SITEMINDER_RESERVATIONS_RUN` with only counts: `read`, `skipped`, `saved`, `failed`, `retryLater`. It never logs the SiteMinder answer or guest data. When the confirmation itself does not reach SiteMinder, the run fails; the saved reservations come back and are saved again without a second booking.

Once a message of a reservation has to wait, the later messages of the same reservation in that run wait too (logged with reason `EARLIER_MESSAGE_PENDING`). Otherwise a `Cancel` could be saved before its `Book`, and the `Book` would come back on the next read and book the nights again. A message that was refused to SiteMinder does not hold the later ones, because SiteMinder will not deliver it again.

Not built yet:

- The schedule (every 2 to 5 minutes) and the Lambda handler.
- Step 5: sending the new availability to SiteMinder after a reservation.
- What to do when the nights are already taken in Domits (an overbooking). The booking is saved like a Channex import; how to warn the host is still a product decision.
- The frontend shows `bookingtype = siteminder` like any other booking. `isChannexBooking` only knows `channex`.

## When a send is tried again

`SiteMinderSoapError.retryable` says whether the same message can work on a later try:

| Answer | Retryable | Why |
| ------ | --------- | --- |
| Timeout or network error | yes | the message may not have reached SiteMinder |
| HTTP 5xx without an OTA answer | yes | SiteMinder had a problem, not the message |
| OTA `Errors` answer | no | SiteMinder refused the message itself |
| SOAP fault (for example wrong credentials), also with HTTP 500 | no | sending the same message again gives the same fault |

## Mapping

The mapping uses the shared `channel_integration_*` tables that Channex also uses, so there is no new table or migration.

| Table | SiteMinder value |
| ----- | ---------------- |
| `channel_integration_account` | one row per host, `channel = SITEMINDER`, `externalAccountId` = our pmsCode, `credentialsRef` = the secret name |
| `channel_integration_property` | `externalPropertyId` = SiteMinder hotel code |
| `channel_integration_room_type` | `externalRoomTypeId` = `roomTypeCode` (also used as `InvTypeCode`) |
| `channel_integration_rate_plan` | `externalRatePlanId` = `ratePlanCode` |

One SiteMinder room type is one Domits property. In SiteMinder a host sells villas, apartments and holiday homes as room types inside one property (the API calls it a hotel), each with a number of units. In Domits one property is one rentable unit. So a villa park with two villas is one SiteMinder hotel with two room types, linked to two Domits properties, and a reservation for both villas becomes two Domits bookings. Decided with Stefan on 9 November 2026; refusing multi-room reservations is not an option, and SiteMinder tests them in its certification.

Availability for a linked room type must be sent as 1 or 0 per date, taken from the calendar of its Domits property, so SiteMinder never sells one villa twice, even when the room type says more units. The part that builds availability from the calendar is not built yet.

`SiteMinderMappingService.syncRoomType({ userId, domitsPropertyId, hotelCode, roomTypeCode })`:

1. Only the owner of the Domits property may link it.
2. A hotel belongs to one Domits host. Another host gets `SITEMINDER_HOTEL_ALREADY_MAPPED`.
3. A room type can be linked to only one Domits property at a time (`SITEMINDER_ROOM_TYPE_ALREADY_MAPPED`), so one villa never gets two calendars.
4. Reads Rooms and Rates from SiteMinder. A room type that SiteMinder does not have gives `SITEMINDER_ROOM_TYPE_NOT_FOUND` and nothing is stored.
5. Stores the hotel, the room type and its rate plans as `ACTIVE` for this Domits property.
6. Sets everything else of this Domits property in this hotel to `INACTIVE`: the room it was linked to before, and rate plans SiteMinder no longer returns. Linking the same room again is safe.

The ARI check (`SiteMinderInventoryService`) accepts the room types of every Domits property of the host in that hotel.

## Why sending is checked first

Seen in the sandbox: SiteMinder answers `Success` for an unknown rate plan code and for a currency other than the hotel's, and then drops or applies the update without telling us. So `SiteMinderInventoryService` only sends when:

- the hotel is mapped to a Domits property through a `SITEMINDER` account,
- every room type (and for restrictions and rates, every room type + rate plan) is `ACTIVE` in that mapping,
- rates are in `SITEMINDER_CURRENCY` (Domits prices in one currency; SiteMinder does not convert).

Anything else is refused with a `SiteMinderMappingError` before a call is made.

Rates go out as `AmountBeforeTax`: the Domits base rate is the net nightly accommodation charge, before VAT and local taxes (confirmed by Stefan on 2026-10-28).

## Values checked before sending

- Dates are `yyyy-mm-dd` and must be a real calendar day (`isIsoDate` in `util/otaValues.js`), so 2026-02-30 is refused before it reaches SiteMinder.
- Amounts are sent with two decimals, rounded half up on the decimal value (`toAmount`): 1.005 becomes "1.01", where `(1.005).toFixed(2)` would give "1.00".

## Configuration

| Variable | Default | Meaning |
| -------- | ------- | ------- |
| `SITEMINDER_PMS_CODE` | required | Our PMS code (RequestorID) from SiteMinder. The sandbox uses `PMSXTEST` |
| `SITEMINDER_CURRENCY` | `EUR` | Currency of every rate |
| `SITEMINDER_BASE_URL` | pre-production | `https://tpi-pmsx.preprod.siteminderlabs.com` until go-live. Must start with `https://`, because the Basic and WS-Security credentials go with every request; anything else makes `createSiteMinderServices` throw before the secret is read |
| `SITEMINDER_SECRET_NAME` | `domits/siteminder/pmsxchange` | Secrets Manager secret (eu-north-1) with `{"username": "...", "password": "..."}` |

One PMS-level login covers all hotels. It never goes into code, logs or errors.

## Testing against the sandbox

SiteMinder's shared test account (PMS code `PMSXTEST`, hotels `PMSXTEST1` to `PMSXTEST3`) is in their Postman workspace, environment "pmsXchange - Rooms and Rates TEST". Production access needs a SiteMinder partnership and their certification (create, modify, flush and reservation scenarios).
