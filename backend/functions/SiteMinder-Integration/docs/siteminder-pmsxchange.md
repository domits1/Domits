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

Not built yet: receiving reservations, the Lambda handler and schedule, and the host screen.

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

## Configuration

| Variable | Default | Meaning |
| -------- | ------- | ------- |
| `SITEMINDER_PMS_CODE` | required | Our PMS code (RequestorID) from SiteMinder. The sandbox uses `PMSXTEST` |
| `SITEMINDER_CURRENCY` | `EUR` | Currency of every rate |
| `SITEMINDER_BASE_URL` | pre-production | `https://tpi-pmsx.preprod.siteminderlabs.com` until go-live |
| `SITEMINDER_SECRET_NAME` | `domits/siteminder/pmsxchange` | Secrets Manager secret (eu-north-1) with `{"username": "...", "password": "..."}` |

One PMS-level login covers all hotels. It never goes into code, logs or errors.

## Testing against the sandbox

SiteMinder's shared test account (PMS code `PMSXTEST`, hotels `PMSXTEST1` to `PMSXTEST3`) is in their Postman workspace, environment "pmsXchange - Rooms and Rates TEST". Production access needs a SiteMinder partnership and their certification (create, modify, flush and reservation scenarios).
