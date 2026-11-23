# feat(distribution): add a Sync history card to the Distribution tab (#506)

Pull request: not opened yet
Issue: #506
Reviewed commits: `ea39a7dc4`, `71df0170d`, `733fc7473`, `59516016a`, `2531a677c`, `55aac03e3`, `bf4b02d35`
Result: no blocking findings open

This replaces the "Sync health" coming-soon card with a card that lists the last 10 syncs of the picked property, from real data and read-only. It sits next to the Last sync card and shows only where that card shows. The Last sync review (#3923) deferred it as "the sync history card in a later pull request".

The branch starts from `origin/acceptance`. The platform cards stack (#3978, #3982, #3984, #4007) also edits `HostChannelDistribution.js`, so whichever lands second merges acceptance and resolves that file.

## Decisions

1. **The list route, not `/latest`.** `GET /integrations/channex/sync-evidence?domitsPropertyId=…&limit=10` through the existing `listChannexSyncEvidence`. No new fetch code and no `userId`: the handler overwrites it from the token. The route is in the same allowlisted array as `/latest`, so the same users reach it.
2. **The service refuses a missing property.** `/latest` answers 400 without one, but the list answers the whole account. The tab never asks without a property, and `getSyncHistory` throws as well.
3. **One shared outcome rule set.** The rules moved from `LastSyncCard.js` to `utils/syncOutcome.js` in a no-behaviour-change commit, so both cards say the same thing for the same sync. The history uses only `tone` and `label`.
4. **List rows have no counts.** `/latest` returns `warningCount` and `errorCount`; the list returns the `warnings` and `errors` arrays. The row mapper counts the arrays before the shared rules run.
5. **A slim row, immediately.** The list answers whole evidence rows, including payload snapshots, `rawDetails`, notes and error details. `toSyncHistoryRow` keeps only `id`, `startedAt`, `kind`, `tone`, `outcomeLabel`, `warningCount` and `errorCount`, so nothing else is held in state or logged.
6. **No notes, no codes.** Only counts are shown. The notes and errors are written for engineers and may hold ids and provider messages. See open question 5.
7. **Host words for the kind.** A `Map` from `syncType` to a label. An unknown or missing type shows "Sync", and the raw value is never shown. A `Map`, so `"constructor"` cannot match an inherited property.
8. **A broken answer is an error, not an empty history.** An answer without an `items` list throws, and the card shows the error sentence instead of "No syncs yet".
9. **The newest-first order is the backend's.** The rows are not re-sorted.
10. **One shared request guard.** `usePropertyScopedRequest` holds the "no request without a property, drop the old data at once, ignore a late response" logic for both hooks. `useLatestSyncEvidence` keeps its exports and return shape.
11. **The helper reads `request` and `select` through a ref.** A first version put them in the effect dependencies. An inline function then restarted the request on every render (an endless GET loop, found by a mutation check that hung Jest). The ref removes that footgun.
12. **The locale stays `nl-NL`.** `formatDateTime` is shared and unchanged. The locale is a known follow-up from Karim's review and will be fixed in one place later.

## Findings

One eng-review ran on each staged diff before its commit. No P1 or P2 finding came out of this PR.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Defect, fixed before the commit | `hooks/useLatestSyncEvidence.test.js` | "ignores a late response for a property that is no longer selected" passed with the guard removed: the late resolve ran outside `act`, so React never rendered the stale update. | Fixed in commit 2: the resolve is wrapped in `act`. With the guard removed, 3 tests now fail. |
| Nit, fixed before the commit | `hooks/usePropertyScopedRequest.js` | The comment said the endpoint answers 400 without a property. True for `/latest`, not for the list. | Reworded to "Without a property nothing is requested". |
| P3 (7/10) | `hooks/usePropertyScopedRequest.test.js` | With `request` and `select` back in the dependencies, the loop hangs Jest and is caught only by a timeout, not by an assertion. | Accepted: React does not throw for this loop (the updates run in passive effects), so a clean failure needs a more involved test. |
| P4 (5/10) | `HostChannelDistribution.js` | A property change now sends two GETs, `/latest` and the list. The Last sync item is the newest row of the list. | Accepted: `/latest` is slim and the list is not. See open question 1. |
| P4 (4/10) | `utils/syncHistoryRows.js` | `filter(Boolean)` drops `null` but not a truthy non-object entry. | Accepted: the backend sends objects. |
| Nit | `channexDistributionService.test.js` | The missing-property `test.each` also calls `getSyncHistory()` with no argument in every case. | Accepted: redundant, harmless. |

## Architecture and data flow

Level: component. The request guard and the rules are separate from the cards, and the view only places them.

```text
HostChannelDistribution (view)
  ├─ useLatestSyncEvidence ─┐
  │                          ├─▶ usePropertyScopedRequest ─▶ channexDistributionService
  └─ useSyncHistory ────────┘      (guard: no property, stale response, 404)   getLatestSyncEvidence
        │                                                                       getSyncHistory ─▶ listChannexSyncEvidence (channexApi.js)
        └─ select: toSyncHistoryRows ─▶ toSyncHistoryRow ─▶ describeSyncOutcome (utils/syncOutcome.js, shared)
                                                          └▶ kind label (Map)
  ├─ LastSyncCard      ─▶ describeSyncOutcome
  └─ SyncHistoryCard   (rows only, no payloads)
```

```text
no property ──▶ IDLE (no card, no request)
property    ──▶ LOADING ──▶ LOADED: rows, or "No syncs yet for this property."
                       ├──▶ UNAVAILABLE (404 CHANNEX_NOT_FOUND): no card
                       └──▶ ERROR (anything else, or an answer without a list): one sentence on the card
property changes ──▶ previous rows dropped at once, new request, late response ignored
```

## What already exists

- `listChannexSyncEvidence` and `requestChannex` (the Bearer token, the URL building) are reused as they are.
- The Last sync card's outcome rules, `formatDateTime`, the card, badge and `output`/`alert` conventions, and its hook's stale-response behaviour are reused and now shared.
- The view's `showLastSync` condition gates both cards.

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| A late response for the previously picked property | Hook tests (strong, with `act`) | Ignored: the rows of the current property stay. |
| An answer without an items list | Row rules and hook tests | The error sentence on the card, not "No syncs yet". |
| 404 `CHANNEX_NOT_FOUND` | Hook and view tests | No card (the status card explains it). |
| 500, network failure, or any other 404 | Hook and view tests | One sentence on the card, the detail in the console, and the Last sync card and the page are unaffected. |
| An unknown or missing `syncType` | Row rule tests | "Sync"; the raw value is never shown. |
| A missing `warnings` or `errors` list | Row rule tests | Counted as 0. |
| A request without a property | Service and hook tests | Refused in the service; the hook never asks. |
| A very large answer (payload snapshots, 10 rows) | Not covered | Not handled here: only the backend can slim it. See open question 1. |

None is a critical gap.

## Not in scope

- A slim list answer or a summary view. That is a backend change (open question 1).
- Showing notes, error codes, task ids or date ranges of a sync.
- A Refresh for this card. Like the Last sync card, it loads when the property is picked, with no polling.
- Moving the Last sync and Sync history cards into the platform cards section when `MOCK_HOST_DISTRIBUTION_ENABLED` goes live (open question 6).
- The locale of `formatDateTime`.
- The `panoramaElitePagesPin` failure inherited from acceptance (#3099).

## Open questions

For the pull request description.

1. **Response size, not measured.** The list route answers whole evidence rows, including `groupedOutboundPayloadSnapshot` and `rawDetails`, for all 10 rows. I could not call the route without an allowlisted Cognito token, so the size is not measured. Request for Enes: a slim list (reuse `formatChannexEvidenceLatestSummary` for the list, or a `view=summary` parameter) so a host does not download payload snapshots for ten rows. A property change now sends two requests, `/latest` and the list.
2. What is the full set of `status` values written to evidence? The shared rules fall back to "Warnings" for an unknown one.
3. Are the booking syncs (`booking_pull`, `booking_receive`, `booking_ack`) wanted in a host's sync history, or only price and availability syncs? The route takes one `syncType` per request, so showing only some would need a filter on the backend or on the frontend.
4. What does `restrictions` cover exactly (prices plus stay rules, or stay rules only)? "Prices and stay rules" is a guess.
5. Should the notes ever be shown, and if so, which? The safe route would be a fixed list of known note codes mapped to host sentences, which needs the backend to say what notes can exist.
6. When the platform cards go live, where do the Last sync and Sync history cards move? Both sit under the account-level `isConnectedOrNeedsAttention`, which is false while `MOCK_HOST_DISTRIBUTION_ENABLED` is on.
7. Are "Sync history", "Sync" (the fallback kind) and "Full sync" (for `certification_full`) the right words? The final copy belongs to Ilan.

## Test results

- The distribution folder: 15 suites, 224 tests, all passing (11 suites and 147 tests on `origin/acceptance`).
- New in this PR, 77 tests: the row rules (35), the service call (5 new), the hook (12), the shared request helper (2), the card (14) and the view (9 new; three existing view tests were scoped to the Last sync card and one made to also 404 the history).
- The full web suite: 304 suites passed, 1 failed. 4351 tests passed, 1 failed, 47 skipped.
- The one failure is `src/features/hostdashboard/website/tests/panoramaElitePagesPin.test.jsx`, also failing on `origin/acceptance` (#3099) and unrelated to this change. `siteHostRouting.test.jsx` failed once under full-suite load and passes alone and on the re-run.
- Deliberate breaks checked against the tests, each caught: the stale-response guard, the property pairing, the 404 rule, the request without a property, the `limit`, a `userId` sent, the service guard, `select` not applied, polling, re-sorting, an unknown type shown raw, an inherited-property lookup, counts from the lists, payloads kept in the row, an answer without a list read as empty, an outcome rule changed in the shared util (fails both cards' tests), counts at zero, the singular form, the alert role, the unavailable state, the badge tone, the empty sentence, the date, the Sync health placeholder, the property passed to the hook, the rows and the load state passed to the card.
- Two breaks are not caught, for the reasons above: a card rendered outside the `showLastSync` gate (an equivalent mutant: with no connection no property is selected, so the hook stays idle), and the `request` and `select` dependencies put back in the helper (the loop hangs Jest and is caught by a timeout, not an assertion).
