# feat(channex): provision a host's listing in Channex (#506)

Pull request: #4031
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

## Findings from the PR review (24 Nov)

| Point | Decision |
|---|---|
| `findListing` returned no title, property type or address, so Channex would refuse every property and look-before-create never matched (the payload tests used a hand-made listing) | Fixed: `findListing` loads title, `property_type.type` and the full location; a test builds the payloads from the stored row, and was red on the old code. |
| A second request continued a `PROVISIONING` claim that was still running, so both could create a property | Fixed: a claim is only taken over after 60 s without changes (Lambda stops at 30 s), with a conditional update on `updatedAt`; otherwise 409. |
| `ensureHostAccount` pointed a row with another Channex key at Domits' key | Fixed: such a row is left alone, 409 `DISTRIBUTION_OWN_CHANNEX_ACCOUNT`. A row without a key (after a disconnect) is reconnected, because turning on is the host's own action. |
| A 429 answered "Channex refused the listing" | Fixed: 429 is retryable, 503 `DISTRIBUTION_TRY_AGAIN`. |
| `activateClaim` did not check that a row was updated | Fixed: no update, no full sync, 409 `DISTRIBUTION_NEEDS_ATTENTION`. |
| "Comments aren't allowed in the code" | Kept the why-comments: the repo's CLAUDE.md says "Comment why, not what". Comments that only repeated the code were removed. |
| PR over 1,000 lines | Split: timezone, payloads and create calls in their own pull request; this one keeps the service and the migration. |
| Adopting by title could take another host's leftover property with the same title | Accepted: Channex offers no field of our own to match on; leftovers are Domits' own, and two matches stop with "needs attention". |

## Findings from the second PR review (25 Nov)

Commits: fa838e111 (pagination), 13429c798 (list deadline), cee404e3a (website link), 9cc99cfd2 (match on the id inside the link), d62a7ae2f (comment cleanup). Each was reviewed on its staged diff before it was made. The rows above about list timeouts and adopting by title are superseded by these.

| Point | Decision |
|---|---|
| Channex lists answer 10 records unless asked for more, so look-before-create missed a match past the first page and created a duplicate | Fixed: `readAllPages` asks 100 per page and reads until `meta.total` or a short page; a failing page fails the whole list (a partial list would look like "not there yet"); more than 20 pages fails with `…_TOO_MANY_PAGES` |
| The list calls had no timeout, so a hanging Channex held the turn-on until API Gateway's 504 | Fixed: one 5 s deadline across all pages of a list (`CHANNEX_LIST_TIMEOUT`, answered as try again). Accepted limit: three lists of 5 s plus three creates of 7 s is 36 s in the worst case, above the 29 s; it only happens when every call is slow, and the lease plus look-before-create cover an attempt that is cut off |
| Adopting by title could take another host's property with the same title (all hosts share Domits' key) | Fixed: the property is created with `website` = the listing's Domits page, and only a property whose link carries this listing's id is adopted. A same-titled property with another link or none is not adopted |
| Channex may store the link differently from how it was sent | Fixed: the listing id is read out of the link (scheme, `www`, host case, trailing slash and encoding do not matter; another host, page or a missing `ID` is no match) |
| Is there a safer key? (Channex docs, 25 Nov) | No field for an external id or idempotency key exists; `website` is a documented property field (URI). Groups (`group_id` on create) would keep other hosts' properties out of the search, but `GET /properties` has no group filter (only `title`, `city`, `country`). Noted in D2 for later |
| Properties created before this change have no link | Accepted: only staging test properties. Archive or delete them in Channex staging before the Booking.com test, so a retry cannot meet them |
| "#4031 review" history in code comments | Removed; the why stays |

Manual check before the Booking.com test: after the first turn-on on staging, open the property in Channex and confirm `website` holds the listing's link.

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
