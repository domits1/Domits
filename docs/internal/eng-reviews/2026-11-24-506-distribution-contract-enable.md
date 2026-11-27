# feat(distribution): match the enable flow to the backend contract (#506)

Pull request: #3984
Issue: #506
Review feedback: Enes, "request changes": the mock shapes, field names and error codes must match the contract.
Reviewed commits: `6d1eaa653` (merge of the connect flow, #3982), `f71ed1f62`, `30735df81`, `f6897e64d`
Result: no blocking findings

This supersedes the design in `2026-11-20-506-distribution-enable-flow.md` where they differ: the enable answer is no longer applied to the listing, and the setup-failed notice is gone.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `useConnectFlow.js`, `retry`, right after the merge | The setup-failed notice was its only caller, and the contract removes that state. | Fixed in `f6897e64d`: the Setting up notice calls it. |
| P3 (6/10) | `hostDistributionApi.js`, enable of a `PROVISIONING` listing, right after the merge | The mock answered 409 for it, so a preview of that listing was stuck. | Fixed in `f71ed1f62`: turning it on again resumes it. |
| P3 (6/10) | `enableErrors.js`, `DISTRIBUTION_NEEDS_ATTENTION`, `UNKNOWN_COUNTRY`, `CHANNEX_REFUSED` | Three sentences say "Contact support", but there is no address or link to show. | Accepted, and asked to Enes. |
| P3 (5/10) | `enableErrors.js`, the status fallback | An unknown 409 or 422 code now shows the generic sentence and does not read the listings again. | Accepted: never silent, at most one wasted try. |
| P3 (6/10) | `DistributionNotices.js` and `ConnectFlowLayer.js` | "Setting up your listing…" is a literal in both files, and `showEnabling` only keeps them apart. | Accepted. |
| P3 (6/10) | `PlatformCardsSection.js`, `SettingUpNotice` | A Retry during a setup that really is running gets a 409 and a silent re-read, so it can be pressed repeatedly with no feedback. | Accepted, and asked to Enes. |

## Architecture and data flow

```text
Continue (checklist / timezone) ── enableDistribution({ propertyId, chosenTimezone? })
   │ answers { status: PROVISIONED | ALREADY_CONNECTED }   (not read: the listing decides)
   ▼
rereadListings() ──▶ fresh listing
   READY ─────────▶ connect session ──▶ iframe (a Retry has no platform and stops at the cards)
   not READY ─────▶ idle: the Setting up notice shows, Retry = turn on again (resumes)
   read failed ───▶ idle with the generic sentence
enable error ── classifyEnableError(error) ── by errorCode ──▶ sentence + rereadListings per code
```

The contract's codes map to host sentences in `utils/enableErrors.js`. The 404 and 403 sentences are shared with the connect errors in `listingErrors.js`. A 5xx with an unknown code reads the listings again, anything else only tells the host. `validationDetails` of a refused setup reach the console only. The listing's `timezone` sits under `distribution`, and the timezone modal reads it from there.

## Not in scope

- Disconnect (#4007): the contract has no route, so it keeps its mock.
- A shared constant for the Setting up sentence.
- A hint for a Retry that keeps getting a 409.

## What already exists

`rereadListings`, `classifyListingError` and the step machine of `useConnectFlow` were reused. `connectFlow.retry` and the timezone modal were already there.

## Failure modes

| Failure | Test | Handling | What the host sees |
|---|---|---|---|
| Any of the 11 contract codes | yes | sentence and re-read per code | the sentences in `enableErrors.js` |
| Enable works but the re-read fails | yes | error path, no session | "We couldn't set up this listing. Try again." |
| Retry while another setup runs | yes | silent re-read | the same notice |
| Network failure | yes | generic sentence, no re-read | same |

No critical gap.

## Mutation checks

Each mutant was applied, a test went red, and the change was reverted: the session opened although the fresh listing is not READY; an enable failure never reading again; the fresh listing ignored; `timezone` sent instead of `chosenTimezone`; READY answering `PROVISIONED`; an invalid timezone accepted; a try-again that never resumes; classification by status instead of code; the re-read flag flipped for not-configured, unknown country and try-again; a server error never reading again; the setting-up view missing or ranked above missing items; Retry doing nothing or never disabled; the flow's sentence shown next to the notice's.

## Tests

The frontend/web suite has one failing file, `listingDetails2.test.js` (9 tests), which fails the same way on the branch before these commits.

## Update 2026-11-25: own Channex account, and the connect changes merged in

- The merge of #3982 brought in two contract changes (refresh answers `{ listing }`, and the UNKNOWN channel label); they are reviewed in `2026-11-24-506-distribution-contract-connect.md`. The merge had two conflicts. The contract comment keeps both the `{ listing }` line and the `enableDistribution` notes. The test that read "a refresh updates the channels only" now asserts the replacement through the distribution status, which in this branch decides between the cards and the Setting up view (a refresh that answers a PROVISIONING listing swaps the cards for it).
- Turning a listing on can answer `409 DISTRIBUTION_OWN_CHANNEX_ACCOUNT`. `classifyEnableError` maps it by code to "This listing is linked to your own Channex account. Contact support." with `reread: false`: the listing did not change, so there is nothing to read again. Other 409s keep their own entries, and an unknown 409 still gets the generic sentence.

| Failure | Test | Handling | What the host sees |
|---|---|---|---|
| Turn-on answers 409 own Channex account | yes (unit and flow) | classified by code, no re-read, no session | "This listing is linked to your own Channex account. Contact support." |
| The same code arrives with another status | yes | still classified by code | the same sentence |
| Another 409 | yes | its own entry, or the generic sentence | unchanged |

No critical gap.

Mutation checks, each applied, red, then reverted: the re-read flag flipped for the own-account code; classification by status 409 instead of by code; the entry removed. The refresh test rewritten in the merge was also checked: a refresh that merged only the channels turned it red.

Tests: the folder passes (385). The whole web suite has one failing file, `panoramaElitePagesPin.test.jsx` (one snapshot), which fails the same way on the branch before these commits and is an accepted baseline. `listingDetails2.test.js`, the baseline named above, passed in these runs.
