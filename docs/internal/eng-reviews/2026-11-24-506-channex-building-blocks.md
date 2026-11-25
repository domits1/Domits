# feat(channex): timezone, payloads and create calls for provisioning (#506)

Pull request: not opened yet (split off from #4031 at the reviewers' request)
Issue: #506
Reviewed commits: 93cf9c7d0 (timezone), e4e306761 (payloads), 54bb0a863 (create calls)
Result: no blocking findings

The three building blocks of provisioning (design note D2 and D4), reviewed on their staged diffs before each commit. The service that uses them, the migration and the fixes from the #4031 review stay in #4031; its record is `2026-11-24-506-provisioning.md`.

## Checked before building

| Check | Result | Decision |
|---|---|---|
| Country names in `main.property_location` (23 Nov) | Stored as host onboarding writes them (`react-select-country-list`); Intl spells 47 of 249 differently ("Turkey", "Tanzania, United Republic Of") and turned "France" into the old code FX | The backend uses the same package for name → code; Intl only gives the timezones |
| Timezones per country | Germany and Cyprus have two zones with the same clock time | The host only picks when the zones show a different time in winter or summer |
| Lockfile after `npm i` | npm 11.8 also removed the `libc` fields of `sharp`'s platform packages | Lockfile restored, only the new package added; `npm ci --dry-run`: up to date |
| Channex create API (docs, 23 Nov) | `country` ISO alpha-2; an empty `property_type` is billed as a hotel; per-room rate plan has one option at max occupancy; new id in `data.id`; 422 carries field messages | Payloads follow these rules; `property_type` is never empty |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `listingTimezone.js` | The Node 22 branch (`locale.timeZones`) never runs on a newer local Node | CI runs Node 22, so CI covers it |
| P3 (6/10) | `listingTimezone.js` | Same-clock countries take the first zone (Cyprus → `Asia/Famagusta` for a Nicosia villa) | Accepted: same times, only the zone name differs in Channex |
| P3 (6/10) | `channexProvisioningPayloads.js` | Property types match on exact spelling ("Villa") | Accepted: onboarding writes capitals; a miss still bills as a vacation rental |
| P3 (5/10) | `backend/package.json` | The country list package is in every Lambda bundle | Accepted: a 249-country JSON list without dependencies |
| P3 (6/10) | `providerClient.js` | The create helper reuses `postChannexPushRequest`, whose timeout code says "push" | Accepted: translated to `CHANNEX_CREATE_TIMEOUT` |

The #4031 review asked for a 429 to be retryable and for the payloads to be tested with the stored listing shape; both are fixed in #4031, where the listing loader and the service live.

## Not in scope

- The provisioning service, the account index migration and the review fixes: #4031.
- Routes and screens: the next pull request.
