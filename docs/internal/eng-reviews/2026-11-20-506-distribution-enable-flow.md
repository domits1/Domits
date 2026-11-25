# feat(distribution): turn on distribution for a listing from the platform switches (#506)

Pull request: #3984 (stacked on #3982, which is stacked on #3978)
Issue: #506
Reviewed commits: `94bfd0beb`, `d8d3fae91`, `976649f5a`, `3024563ff`, `9aa6e08bc`, `2bc662cf4`, `8dd8c6a48` (refactor, no behaviour change), `73386745f`
Result: no blocking findings open

This is PR B2 of the host self-distribution work (design note #3954). B1 (#3982) connects an OTA for a listing whose distribution is already `READY`. B2 adds the other half: a listing that is not turned on yet. The host turns a switch on, confirms the checklist, picks a timezone only where D4 asks for one, the listing is provisioned (D2), and the Channex screen opens. A listing whose setup failed halfway gets a Retry. PR C adds turning off and the remaining error flows.

Everything still runs against the mock in `hostDistributionApi.js`, behind `MOCK_HOST_DISTRIBUTION_ENABLED` (off).

## Decisions

1. **One pull request.** The plan estimated about 725 lines with tests and offered a B2a/B2b split. One pull request was chosen. The real size is larger: +438 lines of source and +943 lines of tests against the base (the rewrite of the hook tests and the section tests are most of it). The commits are in the order the design was built, so a review can read them one by one.
2. **The route is the one in the design note.** Section 6 gives `POST /host/listings/{propertyId}/distribution`, not `/enable`. The mock and its comments use that path. The function keeps the name `enableDistribution`.
3. **The checklist stays first.** Nothing is provisioned until the host has confirmed it (decided in B1). The timezone comes after it, then enable, then the connect session.
4. **A READY listing never calls enable.** The route is idempotent (D2), but the frontend does not rely on that: it goes straight to the session. A test pins this at the hook and at the section.
5. **Every answer the backend gave to enable reads the listing again.** For a 409, 422, 400 or 5xx the hook calls `refresh(propertyId)` and the refreshed listing explains itself: "Setting up…" for a 409, what is missing for a 422, the setup-failed notice for a failure the backend stored. No status is patched locally. A network error or a status that says nothing about the listing (404, 403) only alerts and changes nothing.
6. **An enable that is not READY stops at "Setting up…".** No Channex screen opens. Refresh finishes it (the mock moves PROVISIONING to READY on refresh).
7. **Timezone options are IANA ids** such as `Asia/Jakarta`, shown with their underscores turned into spaces. Proposed, to confirm with Enes. D4 says the backend derives the zone from the country and the host picks only in a country with several, so the frontend asks only when `timezone.required` is true.
8. **Retry has no checklist and no Channex screen.** It runs the same enable call (D2: the next attempt resumes) and the cards show when the listing is READY. It asks for the timezone first where the listing requires one.
9. **The flow's dialogs moved out of the cards view** (`ConnectFlowLayer`, a separate refactor commit). Retry starts in the setup-failed view, which has no cards, so the timezone modal and the messages had to render there too.

## Findings

One eng-review ran on each staged diff before its commit. No P1 or P2 finding came out of B2. Two tests were also run against a deliberate break to check that they can fail (the 409 rule, and the hidden flow alert).

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (6/10) | `services/hostDistributionApi.js` (`enableDistribution`) | A timezone that is not among the options gets the same `TIMEZONE_REQUIRED` as a missing one. | Accepted for the mock. Open question for Enes. |
| P4 (5/10) | `components/TimezoneModal.js` | With an empty `options` list the select has only the placeholder, so Continue can never enable. | Fixed in the hook: a required timezone with no options is an error, not a dead modal. Covered by "a required timezone with no options is an error". |
| P4 (6/10) | `components/PlatformCardsSection.js`, `utils/enableErrors.js` | A 5xx whose failure the backend stored showed both the flow's alert and the setup-failed notice. | Fixed in the Retry commit: the flow's message is left out while the notice shows. Three tests fail without it. |
| P4 (6/10) | `hooks/useConnectFlow.js` (`failEnable`) | The log line "Failed to turn on distribution…" is also used for a required timezone without options. | Accepted. |
| P4 (5/10) | `components/ConnectFlowLayer.js` | `platform` and `listing` prop types are `PropTypes.object`, which Sonar may flag. | Accepted. Narrow them if Sonar flags them. |
| P4 (5/10) | `components/PlatformCardsSection.js` | After a Retry that fails with a network error the host sees the notice's generic "Try again", not the flow's sentence. | Accepted: the notice already says it. |

## Architecture and data flow

Level: component. The step machine is in a hook, the rules are pure, and the section places what the hook says.

```text
PlatformCardsSection ──▶ useHostDistribution ──▶ hostDistributionApi (getHostListings, refreshChannels)
  │                         exposes applyListing and refresh
  ├──▶ useConnectFlow({ refresh, rereadListings }) ──▶ hostDistributionApi (enableDistribution, createConnectSession)
  │                                              └──▶ utils/enableErrors.js (classifyEnableError, pure)
  ├──▶ PlatformCard x3 / SettingUpNotice (Retry)
  └──▶ ConnectFlowLayer ──▶ ConnectChecklistModal | TimezoneModal | ChannexIframeModal | messages
```

```text
idle ──start──▶ checklist ──Continue──▶ ┬─ listing READY ─────────────────────────────────────────────┐
  ▲                │                    └─ not turned on ─▶ timezone required?                          │
  │              Cancel                                     yes ▶ timezone ─Continue(zone)─┐            │
  │                                                         no ───────────────────────────┤            │
  │                                                                                        ▼            │
  │   enabling: enableDistribution (gives up after 60 s) ─ok─▶ rereadListings ─ READY ──────┤            │
  │       │                                              ├─ not READY ▶ idle ("Setting up…")            │
  │       │                                              └─ read failed ▶ idle, listing marked           │
  │       │                                                 unconfirmed ("Setting up…" + Retry)         │
  │       └─ error or timeout ▶ idle with the message; some codes, and a timeout, read the listings again │
  │                             (utils/enableErrors.js)                                                   ▼
  └──close, refresh(propertyId) once── iframe ◀──session ok── connecting ◀──────────────────────────────┘
                                                  session fails or gives up after 30 s: message, idle
                                                  (404 or 409 also read the listings again)

retry({ listing }) is the same machine without the checklist and the session:
idle ──▶ [timezone] ──▶ enabling ──▶ idle, for the Retry of a setup that did not finish.

Every request carries an attempt number: after a reset or a timeout its late answer changes nothing,
also when a newer attempt is already in the same step. The error message is stored with its listing id
and shown only for the picked listing. Moved here from the comment of useConnectFlow.js.
```

What each answer shows after the refresh (the first contract's codes; the current table is `utils/enableErrors.js`):

```text
409 PROVISIONING_IN_PROGRESS ─▶ the card says "Setting up…"; Refresh finishes it
422 LISTING_NOT_READY ────────▶ the not-ready notice lists what is missing
400 TIMEZONE_REQUIRED ────────▶ "Choose a timezone to continue."; the next try asks for the timezone
5xx PROVISIONING_FAILED ──────▶ stored: the setup-failed notice with Retry; not stored: "We couldn't set up this listing. Try again." on the cards
```

## Mock shapes (proposed, to confirm with Enes)

```text
enableDistribution({ propertyId, timezone }) -> { listing }      POST /host/listings/{propertyId}/distribution
  idempotent: a READY listing comes back unchanged; a PROVISIONING_FAILED one is tried again
  errors: 400 TIMEZONE_REQUIRED, 404 LISTING_NOT_FOUND, 409 PROVISIONING_IN_PROGRESS,
          422 LISTING_NOT_READY, 500 PROVISIONING_FAILED
listing.timezone = { required, options: ["Asia/Jakarta", ...] }   IANA ids
MOCK_ENABLE_OUTCOME = "success" | "in-progress" | "timezone-required" | "not-ready" | "failed"
```

Each error outcome also stores what a backend would leave behind, so the Refresh after it shows it. New fixtures: a listing that needs a timezone and one stuck in PROVISIONING.

## What already exists

- `ChannexModalShell`, `modalTestHelpers.DISMISS_ACTIONS` and the field and button classes are reused by the timezone modal.
- The B1 step machine, its step ref against double clicks and its `mountedRef` are extended, not replaced. The place B1 marked for this work is where the enable step went.
- `useHostDistribution.refresh` and `applyListing` are reused, and `applyListing` is now returned so the flow can store an enable answer.
- `SetupFailedNotice` already existed; it gets the button its comment said would come with the turn-on flow.
- The mock's error builder and `copy` are reused.

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| Enable answers 409 (already in progress, two tabs or a double click) | Util, hook and section tests | The listing is read again and the card says "Setting up…". Refresh finishes it. No alert. |
| Enable answers 422 (listing not ready) | Util, hook and section tests | The listing is read again and the not-ready notice lists what is missing. |
| Enable answers 400 TIMEZONE_REQUIRED | Util, hook and section tests | "Choose a timezone to continue." and the listing is read again, so the next try asks. |
| Enable answers 5xx and the backend stored the failure | Hook and section tests | The setup-failed notice with Retry, and one alert only. |
| Enable answers 5xx and nothing was stored | Section test | "We couldn't set up this listing. Try again." on the cards. |
| Network error on enable | Hook and section tests | Alert, listing unchanged, no refresh. |
| Enable answers without a listing | Hook test | Counts as an error: nothing is applied, no session. |
| Enable answers but the listing is not READY | Hook and section tests | Stops at "Setting up…", no Channex screen. |
| A required timezone arrives without options | Hook test | An error, not a modal that can never continue. |
| Double click on Continue (checklist, timezone) or on Retry | Hook tests | The step ref ignores the second call: one request. |
| Unmount while a request is pending | Hook tests | The answer is ignored, nothing is applied. |
| The refresh after an enable error fails | Existing refresh tests | "We couldn't refresh your connections." for that listing. |
| A stuck PROVISIONING listing | Mock test | Not detectable by the frontend. See the open questions. |

None is a critical gap.

## Not in scope

- Turning off, the disconnect confirm and the error flows for an active channel (PR C). A switch that is on stays disabled until then.
- The route guard (`feature/506-distribution-route-guard`). It must land before any real route is wired. The flag must stay off until the real routes and PR C are in.
- Polling for a listing that is still setting up. The design note says Refresh only (D7).
- Final copy and design (Ilan). The sentences in the modals and notices are placeholders for him.
- A timezone choice for a listing that is already READY. The timezone is only asked for when turning on.

## Open questions for Enes

1. Does enable answer synchronously with a READY listing, or can it answer with PROVISIONING that finishes later? Provisioning is three Channex calls and several rows in one request (D2), so a slow one could hit the API Gateway timeout while the backend carries on. The frontend then sees a 5xx and reads the listing again, which would show "Setting up…" or the failed notice.
2. Does the 409 carry the listing? Today the frontend ignores any body and reads the listing again.
3. What do the timezone options look like on `GET /host/listings`? The mock uses IANA ids in `timezone.options` and `timezone.required`. Can the timezone change after the listing is turned on?
4. Does a 5xx always leave the listing as `PROVISIONING_FAILED` in `GET /host/listings`? The setup-failed notice and its Retry depend on it, and D2 says the next attempt resumes from the first missing object.
5. Are the error codes right? The frontend decides by status (409, 422, 400, 5xx) and only reads the code `TIMEZONE_REQUIRED` on a 400. The proposed codes are `PROVISIONING_IN_PROGRESS`, `LISTING_NOT_READY`, `TIMEZONE_REQUIRED` and `PROVISIONING_FAILED`.
6. When can the backend answer 400 `TIMEZONE_REQUIRED` for a listing that did not ask for a timezone, for example after its country changed? Should the frontend trust `timezone.required` at all?
7. What is the name of the request body field for the timezone, and is the id checked against the options? Does a timezone that is not among them also answer `TIMEZONE_REQUIRED`?
8. Can a claimed `PROVISIONING` row get stuck if the request dies after the claim? The frontend offers no action on a PROVISIONING listing except Refresh, so a stuck one would read "Setting up…" forever.
9. Is the D3 readiness check on enable the same one `GET /host/listings` reports in `readiness`, so a 422 only happens when the listing changed in between?

## Test results

- The distribution folder: 23 suites, 343 tests, all passing (it was 21 suites and 272 tests at the end of B1).
- New in B2, 71 tests in all: the mock (12), the error table (10), the timezone modal (7), the notice (2), and 40 across the hook and the section together (the hook test file was also rewritten for the new `start` signature).
- The full web suite: 284 suites passed, 1 failed. 3848 tests passed, 9 failed, 47 skipped.
- The 9 failures are the known ones in `src/features/bookingengine/listingdetails/pages/listingDetails2.test.js`, also failing on the base of the stack, and unrelated to this change.
- Two deliberate breaks were checked against the tests: dropping the 409 rule failed the 409 section test, and always showing the flow's alert failed three tests.

## Update 2026-11-25: review fixes (Karim, Enes)

The pieces that do not touch the flow (the enable mock, the error table and the timezone modal) moved to `feature/506-enable-building-blocks` (its review note, `2026-11-25-506-enable-building-blocks.md`, is on that branch until it merges). This PR keeps the wiring. The fixes, one commit each; items 1 to 4 each have mutation checks, item 5 changes no behaviour:

1. **A failed re-read after turning on is not "we couldn't set up".** `rereadListings` answers `null` when the read fails. The flow now marks the listing unconfirmed and the section shows the Setting up notice with Retry (turning on again is safe: ALREADY_CONNECTED, or it resumes). The mark clears when a read succeeds, when the enable fails, and on start or reset, not when Retry starts, so the notice does not flip to locked cards for the length of the request. The mark is one id: starting a flow on another listing clears it for the first.
2. **Timeouts.** `createConnectSession` gives up after 30 s and `enableDistribution` after 60 s (turning on provisions at Channex). The host reads "This is taking longer than expected. Try again." A timed-out enable also reads the listings again, since it may have finished. After a timeout the late answer never reaches the flow (`Promise.race` has settled). An attempt counter covers the other case: a reset followed by a new attempt in the same step.
3. **Refresh is locked while a flow runs**, like the switches and the picker.
4. **A connect or enable error belongs to its listing.** It is stored with the listing id and shown only for the picked one; going back to the first shows it again until a new flow starts.
5. **Comments.** The comment lines of `useConnectFlow`, `PlatformCardsSection`, `ConnectFlowLayer` and `DistributionNotices` went from 58 at the start of this round (66 before this commit, with the new comments) to 31. The state diagram moved up into this document and is redrawn for the new branches.

Not done, on purpose:

- The Sonar finding on this PR (item 6) was not available to read and is open.
- `rereadListings` and `refresh` have no timeout: a hung read keeps the flow in `ENABLING`, or Refresh disabled, until a reload. It fits fix 1 (a read that gives up counts as unreadable) and needs a decision.
- `classifyEnableError` and `classifyListingError` look the code up in a plain object, so a code like "constructor" would find a function. It needs the backend to send such a code.

| Failure | Test | Handling | What the host sees |
|---|---|---|---|
| Turned on, re-read fails | yes | marked unconfirmed | Setting up with Retry, no error |
| Session or enable does not answer | yes (fake timers) | gives up, enable also re-reads | the "taking longer" sentence |
| Late answer of a reset attempt | yes | ignored by attempt number | nothing changes |
| Error of listing A while B is picked | yes | scoped by listing id | no alert under B |

No critical gap.

Tests: the distribution folder passes (399). In the whole web suite one file is red, `panoramaElitePagesPin.test.jsx` (4 snapshots), an accepted baseline that fails the same way on `acceptance` without these commits. `listingDetails2.test.js` did not fail in these runs.
