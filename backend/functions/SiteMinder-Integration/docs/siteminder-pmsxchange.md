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

Not built yet: saving reservations as bookings, the Lambda handler and schedule, and the host screen.

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
| `readUndelivered()` | `OTA_ReadRQ` for the whole PMS (`RequestorID` = `SITEMINDER_PMS_CODE`, no `HotelCode`) | SiteMinder asks for one level only, and ARI already works per PMS. Returns the list from `readReservations` |
| `confirm(reservations)` | one `OTA_NotifReportRQ` with `<Success/>` | per reservation: status, message id, the Domits booking id as `ResID_Value` (`ResID_Type="14"`), and the time Domits saved it (`CreateDateTime` for `Book`, `LastModifyDateTime` for `Modify` and `Cancel`). Sends nothing when the list is empty |
| `reportFailure(reservation, error)` | one `OTA_NotifReportRQ` with `<Errors>` and that one reservation, without a booking id | the error type and code come from SiteMinder's error tables. The text is cut to 200 characters and must not contain guest data, because the hotel can see it |

Each call has its own `EchoToken`. A refused or failed call throws `SiteMinderSoapError`, like the ARI calls.

`readReservations` never reads `Guarantee` or `PaymentCard`, so card details do not end up in Domits even when a channel sends them. A reservation without a SiteMinder id or message id throws, because it can be neither saved nor confirmed. A response with a `DOCTYPE` is refused.

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

`SiteMinderMappingService.syncHotel({ userId, domitsPropertyId, hotelCode })`:

1. Only the owner of the Domits property may map it.
2. A hotel code can feed only one Domits property.
3. Reads Rooms and Rates from SiteMinder and stores the room types and rate plans as `ACTIVE`.
4. Sets the ones SiteMinder no longer returns to `INACTIVE`.

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
