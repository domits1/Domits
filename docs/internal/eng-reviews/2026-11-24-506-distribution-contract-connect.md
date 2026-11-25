# feat(distribution): match the connect flow mocks to the backend contract (#506)

Pull request: #3982
Issue: #506
Review feedback: Enes, "request changes": the mock shapes, field names and error codes must match the contract.
Reviewed commits: `1eb98aa23`, `be3bfde9e`, `1fb0b30e2`, `e57d4fd91`, `8d97f0700`, `b43dd53fc`, `8542ad942`
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `distributionStates.js`, `if (listing.distribution?.missing?.length) return LISTING_VIEW.NOT_READY;` | Fails open: a listing with no `missing` array gets the cards, where `!readiness?.ready` failed closed. The contract always sends the array, and the backend answers 422 `DISTRIBUTION_LISTING_NOT_READY` anyway. | Accepted. |
| P3 (7/10) | `distributionStates.js`, `describeAttentionNote` | The "close your dates yourself" note for a channel disconnected outside Domits is gone, because the contract has no flag for it. | Accepted, and asked to Enes. |
| P3 (6/10) | `distributionStates.js`, the `PROVISIONING` branch | A listing stuck in `PROVISIONING` shows locked "Setting up…" cards with no Retry. | Accepted: the Retry notice is #3984. |
| P3 (5/10) | `useConnectFlow.js`, `url: iframeUrl` | An answer without `iframeUrl` reaches the iframe step, and the modal refuses it with its fallback. | Accepted. |
| P3 (5/10) | `useHostDistribution.js`, `rereadListings` | A re-read that lands after a Refresh can overwrite fresher channels. | Accepted: both calls are quick and the next Refresh fixes it. |
| P3 (6/10) | `useConnectFlow.js`, `if (reread) rereadListings();` | `rereadListings` is a required prop with no guard. | Accepted: the only caller passes it. |
| P3 (5/10) | `channexUrl.js`, `CHANNEX_CONNECT_HOSTS.has(url.hostname)` | The port is not checked. | Accepted: https and an allowlisted host are enforced. |

## Architecture and data flow

```text
connect session fails ── classifyConnectSessionError(error) ── by errorCode, not status
   DISTRIBUTION_LISTING_NOT_FOUND  (404) ─▶ "We couldn't find this listing."        + rereadListings
   DISTRIBUTION_LISTING_NOT_OWNED  (403) ─▶ "You don't have access to this listing."
   DISTRIBUTION_NOT_TURNED_ON      (409) ─▶ "This listing isn't turned on yet."      + rereadListings
   anything else (502, no answer)        ─▶ "We couldn't start the connection. Try again."

rereadListings ── getHostListings ──▶ replaces the listings, with no loading state
refresh        ── refreshChannels ──▶ { listing } replaces that listing (a wrong propertyId counts as failed)
```

The shapes follow the contract: `distribution.{status, missing, timezone}`, `channels[].{otaCode, label}`, `{ iframeUrl, expiresInSeconds }`, and the iframe hosts `staging.channex.io` and `app.channex.io`. The mock keeps its role: swapping to the real routes still changes `hostDistributionApi.js` only. `MOCK_HOST_DISTRIBUTION_ENABLED` stays false.

## Not in scope

- Turning a listing on, its error codes and the "Setting up…" Retry notice: #3984.
- Disconnect: the contract has no route and no channel id.
- Error codes for the refresh route: the contract gives none.

## What already exists

`ChannexIframeModal` and `isChannexUrl` were reused, with a narrower host list. The `mountedRef` and refresh-error patterns of `useHostDistribution` were reused.

## Failure modes

| Failure | Test | Handling | What the host sees |
|---|---|---|---|
| Listing not turned on, not found or not owned | yes | classified, re-read where the listing may have changed | a short sentence, and the cards update |
| Connect session fails or the network drops | yes | the generic sentence | "We couldn't start the connection. Try again." |
| Refresh answer without a listing | yes | counts as a failed refresh | "We couldn't refresh your connections." |
| The re-read fails | no | console only | the cards as they were |

No critical gap.

## Mutation checks

Each mutant was applied, a test went red, and the change was reverted: any `*.channex.io` host; the not-ready check removed; the old missing code name kept; the old `displayState` key read; a channel extra added to the mock; `timezone` or `readiness` back on the listing; refresh replacing the listing; no check for missing channels; the old `url` field read; a wrong lifetime; the old not-turned-on code; classification by status instead of code; the re-read flag flipped for 404, 403 and 409; the hook never re-reading; the re-read flashing the loading state (first missed, so the test was made to hold the read pending).

## Tests

The frontend/web suite has one failing file, `listingDetails2.test.js` (9 tests), which fails the same way on the branch before these commits.

## Update 2026-11-25: refresh answers the listing, and UNKNOWN

Two contract changes from Enes, reviewed per commit (staged diff, no blocking findings).

- `channels/refresh` answers `{ listing }` again, in the shape of one listing of `GET /host/listings`. `useHostDistribution.applyListing` replaces that listing; nothing is merged. This supersedes the "merged into the listing" decision above.
- A refresh counts as failed when the answer has no listing, or a listing whose `propertyId` is not the one asked for, so a wrong answer can never overwrite another card.
- Channel labels are LIVE, SYNCING, DISCONNECTED and UNKNOWN. UNKNOWN (Channex did not answer) shows "Status unknown" in the neutral tone, with the switch on but locked, and the note "We couldn't check this connection. Click Refresh to try again." A label outside the list reads the same way, never as Live. Before, an unknown label got the attention state.
- Own-property lookup (`Object.hasOwn`) keeps a label such as "constructor" from matching the state table. Found while writing the tests; it would have produced a card with no label.
- DISCONNECTING and NEEDS_ATTENTION stay mapped for the #4007 mock only. They are no longer in the contract.

| Failure | Test | Handling | What the host sees |
|---|---|---|---|
| Refresh answers another listing | yes | counts as failed, nothing replaced | "We couldn't refresh your connections." |
| Refresh answers no listing | yes | counts as failed | the same sentence |
| Channex does not answer for a channel | yes | UNKNOWN, locked switch | grey "Status unknown" and how to retry |
| A new label the frontend does not know | yes | reads like UNKNOWN | the same grey card, never Live |

No critical gap.

Mutation checks, each applied, red, then reverted: no `propertyId` check; merge of channels instead of replacing the listing; no guard at all; UNKNOWN reading Live; an unknown label reading Live; an unknown label reading the attention state; the UNKNOWN switch unlocked; lookup without `hasOwn`; no UNKNOWN note.

Tests: the folder passes (300). In the whole web suite two files were red, both unrelated and accepted: `panoramaElitePagesPin.test.jsx` (one snapshot, fails the same way on the branch before these commits) and `websiteEditorPageSitePages.test.jsx` (a 5 s timeout under parallel load, passes alone).
