# feat: map Domits properties to SiteMinder hotels and check codes and currency before sending #603

Pull request: #3701
Issue: #603
Reviewed commit: b9114fa19
Result: 2 blocking findings (SOAP fault retried, code comments), fixed in this push. No blocking findings left in the code.

The room rates files (`data/siteMinderRestClient.js`, `util/roomRates.js`) are reviewed in `2026-11-02-603-siteminder-room-rates.md` (#3667). This branch has the latest version of them.

The review ran after the pull request was opened, not before. That was a process miss on my side.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | backend/functions/SiteMinder-Integration/data/siteMinderSoapClient.js:18-19 | A SOAP fault (for example wrong credentials) came with HTTP 500 and was marked retryable, so it would be sent again and fail the same way (Enes on #3671). | Fixed: a SOAP fault is never retryable. Test for a fault with status 500, and a retry table in `docs/siteminder-pmsxchange.md`. |
| P1 (9/10) | business/siteMinderInventoryService.js, business/siteMinderMappingService.js, data/siteMinderSecretRepository.js, util/otaValues.js, util/siteMinderConfig.js, util/ratesMessage.js | Code comments. The team does not keep comments in the code. | Fixed: removed. What they explained is in `docs/siteminder-pmsxchange.md` (Mapping, Why sending is checked first, Values checked before sending, Configuration). |
| P2 (7/10) | backend/functions/SiteMinder-Integration/util/siteMinderConfig.js:17 `baseUrl: String(env.SITEMINDER_BASE_URL ?? "").trim() \|\| undefined,` | The base URL is not checked for `https://`. With a wrong setting the WS-Security password and the Basic credentials would go over plain HTTP. The Truvi config refuses that. | Fixed: `readSiteMinderConfig` throws "SITEMINDER_BASE_URL must use https" for anything else, before the secret is read (commit ce01ad900, reviewed as a staged diff before that commit). Covered by siteMinderConfig.test.js. |
| P2 (6/10) | backend/functions/SiteMinder-Integration/business/createSiteMinderServices.js:35 `propertyLookup: new ChannexExternalBookingImportRepository(),` | SiteMinder uses a Channex repository to look up the Domits property and its host. | Accepted for now: it is the only shared lookup for a property and its host. Moving it to a neutral place in `.shared` is a refactor for later. |
| P3 (6/10) | backend/functions/SiteMinder-Integration/data/siteMinderSecretRepository.js:11-13 | The credentials are cached for the life of the Lambda container, so a new password only works after a cold start. | Accepted: the PMS login changes rarely. After a password change the Lambda needs a redeploy (or new containers) to pick it up. |
| P3 (5/10) | backend/functions/SiteMinder-Integration/business/siteMinderInventoryService.js:39-45 | The mapping lookup reads the account of every row with that hotel code one by one. | Accepted: `#checkHotelIsFree` (siteMinderMappingService.js:101) keeps a hotel code on one SiteMinder property, so there are one or two rows. |
| P3 (5/10) | backend/functions/SiteMinder-Integration/util/roomRates.js:19 | The skipped room rates log had no hotel code (from #3667). | Fixed: the mapping service now passes its hotel code and logger. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| `syncHotel` | the user does not own the property | yes | refused before SiteMinder is called | yes, `SiteMinderMappingError` |
| `syncHotel` | the hotel is already mapped to another property | yes | `SITEMINDER_HOTEL_ALREADY_MAPPED` | yes |
| `syncHotel` | SiteMinder returns no room rates | yes | `SITEMINDER_HOTEL_HAS_NO_ROOM_RATES`, nothing stored | yes |
| `syncHotel` | a room type or rate plan is gone at SiteMinder | yes | set to `INACTIVE` | no, it just stops being a target |
| `pushRates` | rates in another currency | yes | `SITEMINDER_WRONG_CURRENCY` before sending | yes |
| `push*` | unknown room type or rate plan | yes | `SITEMINDER_UNKNOWN_CODES` before sending | yes |
| `push*` | SOAP fault with HTTP 500 | yes | not retryable | yes, the fault message |
| `getCredentials` | secret is not JSON or misses a field | yes | throws a fixed message, no secret in it | yes |

## What already exists

- The shared `channel_integration_*` tables and their repositories from `.shared/integrations/repositories` are reused, so there is no new table or migration.
- The availability, restrictions and rates pushers (#3671, #3676, #3692) are reused behind `SiteMinderInventoryService`.
- `isIsoDate` and `toAmount` now serve all three messages instead of each message checking on its own.

## Not in scope

- The Lambda handler, the schedule and the host screen: later pull requests.
- Receiving reservations (RD): task after the ARI stack is merged.
- The comments in `data/siteMinderSoapClient.js:30` and `:41` and `business/siteMinderAvailabilityPusher.js:4`: they came with #3671, which is already on acceptance.
