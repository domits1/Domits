# feat(channex): provision a host's listing in Channex (#506)

Pull request: not opened yet
Issue: #506
Reviewed commits: 93cf9c7d0 (3a timezone), e4e306761 (3b payloads), 54bb0a863 (3c create calls), 9f134ffb3 (3d-1 guards), 137fec972 (3d-2 account row and claim), aab09f2eb (3d-3 look before create), fafa5ac57 (3d-4 finish)
Result: 1 blocking finding (P1), fixed before its commit; the rest accepted

Each commit was reviewed on its staged diff before it was made. The design is D2, D4 and D8 in `docs/partner/integrations/channel_manager/channex/channex_host_self_distribution_design.md`.

## Checked before building

| Check | Result | Decision |
|---|---|---|
| Country names in `main.property_location` (23 Nov) | Stored as host onboarding writes them (`react-select-country-list`). Intl spells 47 of its 249 names differently ("Turkey", "Tanzania, United Republic Of", "Saint Barthélemy") and turned "France" into the old code FX. | The backend uses the same package for name → code; Intl only gives the timezones. |
| Timezones per country | Germany and Cyprus have two zones with the same clock time; Spain, Portugal, Ecuador, Mexico do not. | The host only picks when the zones show a different time in winter or summer. |
| Lockfile after `npm i` | npm 11.8 also removed the `libc` fields of `sharp`'s platform packages. | Lockfile restored and only the new package added by hand; `npm ci --dry-run`: up to date. |
| Channex create API (docs, 23 Nov) | `country` is ISO alpha-2; an empty `property_type` is billed as a hotel; per-room rate plan has one option at max occupancy; new id in `data.id`; 422 carries field messages. | Payloads follow these rules; `property_type` is never empty. |
| Lambda timeout of UnifiedMessaging | 30 s (API Gateway cuts at 29 s). | Synchronous provisioning with a 7 s timeout per create. |
| Duplicate account rows (24 Nov) | No `CHANNEX` duplicates; one user has three `BOOKING_COM` rows. | The account key covers `CHANNEX` only. |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (8/10) | `channexProvisioningService.js` `ensureHostAccount` | A new host's double click: both requests find no account row and create one (no unique key on `channel_integration_account`), each claims the listing under its own row (the claim key is per account and listing), and Channex gets two properties. Silent. | Fixed before the commit: partial unique index on `("userId", channel) WHERE channel = 'CHANNEX'` (migration `20261123_channel_integration_account_channex_unique`, runbook `dsql_channel_account_unique_runbook.md`); the loser of the insert (`23505`/`40001`) continues with the winner's row. Tests for both codes. |
| P2 (8/10) | Synchronous provisioning | Three creates of up to 8 s each could pass API Gateway's 29 s. | 7 s per create (`CREATE_TIMEOUT_MS`), Lambda timeout checked (30 s). Background provisioning is the step up if staging shows slow calls. |
| P2 (7/10) | `providerClient.js` list calls | `listProperties`, `listRoomTypes`, `listRatePlans` have no timeout (existing code); a hanging list can still push the route past 29 s. | Accepted for now: every id is saved before the next call, so a retry continues. Check real timings on staging. |
| P3 (7/10) | `listingTimezone.js` | The Node 22 branch (`locale.timeZones`) never runs on a newer local Node. | CI runs Node 22 (`test.yml`), so CI covers it. |
| P3 (6/10) | `channexProvisioningPayloads.js` | Property types match on exact spelling ("Villa"); a lowercase stored value would become `holiday_home`. | Accepted: still billed as a vacation rental; onboarding writes capitals. |
| P3 (6/10) | `channexProvisioningService.js` `findOrCreate` | Adopting by title searches all of Domits' account properties, so another host's orphan with the same title could be adopted. | Accepted: orphans are Domits' own leftovers; more than one match stops with "needs attention". |
| P3 (6/10) | `listingTimezone.js` | Same-clock countries take the first zone (Cyprus → `Asia/Famagusta` for a Nicosia villa). | Accepted: same times, only the zone name differs in Channex. |
| P3 (5/10) | `backend/package.json` | The country list package is in every Lambda bundle. | Accepted: a 249-country JSON list without dependencies. |
| P3 (6/10) | `providerClient.js` | The create helper reuses `postChannexPushRequest`, whose timeout code says "push". | Accepted: translated to `CHANNEX_CREATE_TIMEOUT`. |

## How provisioning answers

| Situation | Answer |
|---|---|
| Listing missing / not the host's | 404 / 403 |
| Not ready (D3) / timezone unknown, to pick, or not in the country (D4) | 422 with `missing` or `options` |
| Domits' key reference not configured, or no key | 503 `DISTRIBUTION_NOT_CONFIGURED` |
| Another request holds the claim | 409 `DISTRIBUTION_ALREADY_IN_PROGRESS` |
| Already connected | 200 `ALREADY_CONNECTED` |
| Two unused Channex objects match | 409 `DISTRIBUTION_NEEDS_ATTENTION` |
| Channex slow, unknown outcome, list failed, or finish failed | 503 `DISTRIBUTION_TRY_AGAIN`; the next attempt continues from the saved ids |
| Channex refuses (422) | 502 `DISTRIBUTION_CHANNEX_REFUSED` with the field messages |
| Done | 200 `PROVISIONED`, mapping `ACTIVE`, full sync queued in the same transaction |

## Not in scope

- The routes (turn on, connection screen token, refresh) and the host screens: next pull request. Until then nothing calls this service.
- Applying the account index: after this pull request is deployed, per its runbook.
- `CHANNEX_PROVISIONING_CREDENTIALS_REF` on the UnifiedMessaging Lambda: set before the staging test.
- Timeouts on the Channex list calls: after the staging timings.
