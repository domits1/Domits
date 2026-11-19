# feat(distribution): show the platform cards behind the host distribution flag (#506)

Pull request: not opened yet (stacked on #3923, which is stacked on #3920)
Issue: #506
Reviewed commits: `a3e2e6320`, `671560afc`, `1350440f2`, `87bdfba69` (formatting only)
Result: no blocking findings

This is PR A of three for the Distribution tab, following the design note merged in #3954 (host self-distribution through Channex). It builds on the Last sync card (`feature/506-distribution-last-sync`, which contains the property picker) and is meant to be opened after those pull requests are merged. `acceptance` is merged into this branch later, without a rebase.

Scope of PR A: a mock of the host distribution routes, the pure rules for what each card shows, the three platform cards with their badge and a switch that stays disabled, Refresh, the not-ready and setup-failed notices, loading and error states, and the view wiring behind `MOCK_HOST_DISTRIBUTION_ENABLED` (off). The timezone picker, the OTA checklist and the Channex iframe are PR B. The disconnect confirm and the error flows are PR C.

## Findings

One eng-review ran on each staged diff before its commit.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (7/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/hooks/useHostDistribution.js` (`refresh`) | A refresh answer without a `listing` replaced the listing in the list with `undefined`. The next render then read `listing.propertyId` of `undefined` in `PlatformCardsSection` and threw, which blanks the whole tab. The mock never does this, but the response shape is only proposed, so the swap to the real route could. | Fixed before the commit: an answer without a usable listing counts as a failed refresh, keeps the cards and shows the refresh alert. The test "a refresh answer without a usable listing counts as a failed refresh and keeps the cards" failed with the TypeError first and now passes. |
| P4 (8/10) | `hooks/useHostDistribution.js`, `components/PlatformCardsSection.js` | The refresh failure was one boolean. After a failed refresh on listing A, picking listing B showed "We couldn't refresh your connections." under B. | Fixed before the commit: the hook stores which listing failed, and the section shows the alert only for the picked listing. Covered by "the refresh error belongs to the listing it failed for, not to the next one picked". |
| P3 (8/10) | `components/DistributionNotices.js` (`SETUP_FAILED_MESSAGE`) | The message says "Try again." but PR A has no retry control. | Accepted for PR A: the section is behind a flag that is off. The retry arrives with PR C. The flag must not be turned on before PR C. |
| P4 (8/10) | `components/PlatformCardsSection.js` | The picker markup repeats the one in the view, which belongs to the picker pull request. | Accepted: extracting it would edit code in the pull request below this one. Candidate for a refactor commit after the stack merges. |
| P4 (7/10) | `utils/distributionStates.js` (`UNKNOWN_CHANNEL_STATE`, `needsAttention`) | The attention note depends on object identity of an aliased constant. It is tested ("an unknown display state is never shown as Live"). | Accepted. |
| P4 (6/10) | `components/DistributionNotices.js` (`key={item}`) | If the backend repeats a readiness code, two items share a key. Not certain it can happen. | Accepted. |
| P4 (6/10) | `services/hostDistributionApi.js` (`copy`) | The JSON copy drops `undefined` and dates. | Accepted: mock only, and it goes away with the swap. |
| P4 (5/10) | `hooks/useHostDistribution.js` (`refresh`) | The listing in the answer is not compared with the requested id, so an answer for another listing would put a duplicate id in the list. | Accepted: it needs a contract mismatch nothing suggests. |

## Architecture and data flow

Level: component. The flag is read in one place and the section owns its own data.

```text
HostChannelDistribution
  │ MOCK_HOST_DISTRIBUTION_ENABLED (off)
  │   on  ─▶ PlatformCardsSection replaces the account-level block (status card, empty state, load error)
  │   off ─▶ the view is exactly what it was
  ▼
PlatformCardsSection ──▶ useHostDistribution ──▶ hostDistributionApi   (the only file to change at the swap)
  │                         getHostListings()      GET  /host/listings
  │                         refresh(propertyId)    POST /host/listings/{id}/channels/refresh
  ▼
utils/distributionStates.js   (pure, table-tested)
  describeListingView(listing)             ─▶ NOT_READY | SETUP_FAILED | CARDS
  describePlatformCard(listing, otaCode)   ─▶ { label, tone, switchOn, switchDisabled, note }
  ▼
NotReadyNotice | SetupFailedNotice | PlatformCard x3 (+ Refresh)
```

What each card shows, mapped from the backend's `displayState` and never recomputed from the raw row:

```text
distribution PROVISIONING ───────▶ "Setting up…"       (pending, switch off and locked)
no channel for this OTA ─────────▶ "Not connected"     (neutral, switch off)
SYNCING ─────────────────────────▶ "Syncing…"          (pending, switch on)
LIVE ────────────────────────────▶ "Live"              (success, switch on)
DISCONNECTING ───────────────────▶ "Disconnecting…"    (pending, switch off and locked)
DISCONNECTED ────────────────────▶ "Disconnected"      (neutral, switch off)
NEEDS_ATTENTION or unknown ──────▶ "Needs attention"   (error, switch on, plain-language note)
```

The response shapes are proposed, not agreed. They sit in one block at the top of `hostDistributionApi.js`, marked "PROPOSED, TO CONFIRM WITH ENES".

## What already exists

- `ChannexModalShell`, the modal test helpers and the card, badge, button and picker styles are reused. PR A adds one neutral badge and the switch.
- The `<output>` for loading and refreshing sentences and `role="alert"` for errors follow the view's existing conventions. No `role="status"`.
- The mock error shape mirrors `buildMockChannexRequestError`, which is not exported, so it is copied rather than imported. Sharing it is a separate refactor.
- The old account-level components (`ChannexStatusCard`, the connect and disconnect modals, `PropertyMappingTable`) and `COMING_SOON_CARDS` are untouched.

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| The listings request fails | Section test | "We couldn't load your listings." with Retry. The detail goes to the console. |
| The host has no listings | Section test | "You have no listings yet." |
| The listing is not ready (D3) | Section test | The notice only, with no cards and no Refresh. |
| Setup failed halfway (D2) | Section test | The alert only, with no cards. No retry button until PR C. |
| The refresh request fails | Section test | The cards stay and "We couldn't refresh your connections." shows for that listing only. |
| The refresh answer has no usable listing | Section test | Counts as a failed refresh. Nothing is replaced. |
| The backend sends an unknown `displayState` | State table test | "Needs attention", never "Live". |
| The backend sends an unknown readiness code | State table test | One generic sentence. |
| The picked listing changes while a refresh is pending | Not tested directly | The refreshing state is compared with the picked listing's id, so the other listing's Refresh stays enabled. |
| Unmount during a request | Not tested directly | A mounted guard in the hook. |

None is a critical gap.

## Performance

One GET when the section mounts, one POST per Refresh click. No polling, as the design note requires (D7). Nothing multiplies with the number of listings except the picker options.

## Not in scope

- Toggle flows, the timezone picker, the OTA checklist and the Channex iframe (PR B), and the disconnect confirm and error flows (PR C). The Booking.com checklist item for #3950 (the host must first choose Channex as connectivity provider in the Booking.com extranet) belongs to PR B.
- Removing the old account-level components and the Property mapping table. That is a separate cleanup after the real routes exist.
- The route guard (`feature/506-distribution-route-guard`). It must land before any real route is wired.
- Final design. Ilan owns it. PR A reuses existing classes.

## Open questions for Enes

1. Which route returns `upcomingBookingCount` for the disconnect dialog? The proposed shape puts it on each channel in `GET /host/listings`.
2. Does the backend return `displayState`, or the raw fields? The frontend reads `displayState`.
3. Does `connect-session` need an `otaCode`? The host picks the OTA inside Channex, so Refresh can update all three cards at once.
4. How does the frontend learn that a timezone is required, and the options? Proposed: `timezone: { required, options }` on the listing.
5. Is "provisioning failed" a persisted listing state, or only the error of the POST? The frontend reads `distribution.status: "PROVISIONING_FAILED"`.
6. Can the host switch off an `ERROR` channel? A failed deactivate has an active channel; "disconnected outside Domits" does not.
7. Which sandbox attributes does the Channex iframe need?

## Test results

- New tests: 58 across 6 suites (state rules 23, mock API 4, card 11, notices 2, section 14, view wiring 4).
- The distribution folder: 16 suites, 200 tests, all passing.
- The full web suite on this branch: 277 suites passed, 1 failed. 3705 tests passed, 9 failed, 47 skipped.
- The 9 failures are all in `src/features/bookingengine/listingdetails/pages/listingDetails2.test.js` (the RangeCalendar effective availability tests). They also fail on the unmodified base commit `2b2c76aaf` (`feature/506-distribution-last-sync`), so this change does not cause them. `acceptance` passes this suite. It has `fbeffd3dd` ("restore approval routes and stabilize calendar tests"), which edits that test file and which this branch does not have yet. That commit is the likely reason, not a proven one.
- The full web suite on `acceptance` (`676bc0ee5`): 291 suites passed, 2 failed. 4111 tests passed, 1 failed, 47 skipped. `listingDetails2` passes there. The failing suites are `panoramaElitePagesPin.test.jsx` (not in this branch's tree) and `HostSettingsPrivacySecurity.test.jsx` (passes on this branch). Neither touches the Distribution tab. When `acceptance` is merged in, expect those two to appear here.
