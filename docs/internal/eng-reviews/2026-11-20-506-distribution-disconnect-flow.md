# feat(distribution): turn a platform channel off from its card switch (#506)

Pull request: not opened yet (stacked on #3984, which is stacked on #3982, which is stacked on #3978)
Issue: #506
Reviewed commits: `6b8275fc0`, `9507ff2f6`, `f97f7efe9`, `2eeca0319`, `40bfc5740`, `72290fa97`, `5d10cf895`
Result: no blocking findings open

This is PR C of the host self-distribution work (design note #3954). B1 (#3982) connects an OTA for a listing that is already set up, and B2 (#3984) turns distribution on for a listing that is not. C adds the other direction: the host turns a switch that is on off. The host confirms, Domits closes the dates on that OTA and then disconnects the channel (D5), and the card shows the result.

Everything still runs against the mock in `hostDistributionApi.js`, behind `MOCK_HOST_DISTRIBUTION_ENABLED` (off). The flag was not touched.

## Decisions

1. **One pull request**, in the commit order of the plan. The real size is in the diff stats below.
2. **The mock answers at once with the channel `DISCONNECTING`.** D5 says the backend marks the row `DISCONNECTING`, sets availability to 0 and returns at once, and a worker deactivates the channel about a minute later. So `disconnectChannel` returns `{ listing }` with the channel `DISCONNECTING`, and a Refresh later shows it `DISCONNECTED` (as it already does for `SYNCING` to `LIVE`). A channel that is already `DISCONNECTED` comes back unchanged, so a double click or a second tab is harmless.
3. **Two labels for two moments.** While our request runs the card says "Turning off…" (off and locked). After the answer it says "Disconnecting…" (the D7 label) with the hint "This takes about a minute. Click Refresh to see the result.", because the tab never polls (D7).
4. **A successful answer is applied as it is.** The listing in the answer replaces the one in the list, with no extra request. If the answer has no listing, or one for another listing, the listing is read again once instead. The hook never does both.
5. **Every answer the backend gave to disconnect that says the channel changed reads the listing again.** A 404 or 409 shows no message (the refreshed card says "Not connected" or "Disconnecting…"). A 5xx also reads it again and shows one generic sentence. A network error or another status only shows the sentence and changes nothing. The decision is by status, as in `enableErrors.js`.
6. **The turn-off confirm uses the design note's text.** D5 gives the sentence and the per-OTA place to reopen the dates (the Booking.com extranet, or your Airbnb or Vrbo calendar). The plan added "You can turn {OTA} on again later." and an upcoming-bookings line in the right singular or plural. A channel that was already disconnected outside Domits gets its own text, because there is nothing left to close.
7. **A disconnect and a connect never run at the same time.** While either flow is open, the three switches, the property picker and Refresh are locked. Refresh is locked because, with no modal on screen while the request runs, a Refresh could race the request. The section decides this from both flows, and each flow is also ignored by its own step guard.
8. **A separate hook.** `useDisconnectFlow` has its own steps (idle, confirm, disconnecting) and the same step ref and mounted ref as `useConnectFlow`. The only change to `useConnectFlow` is `clearError`, so a stale message from one flow is never left next to another flow's message.
9. **A switch on a channel that needs attention can be turned off** (proposed, see the open questions): a failed deactivate retries the disconnect, and a channel "disconnected outside Domits" clears its state and can then be connected again.

## Findings

One eng-review ran on each staged diff before its commit. No P1 or P2 finding came out of this PR. Each guard below was also checked against a deliberate break, and every break failed at least one test.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (5/10) | `services/hostDistributionApi.js` (`disconnectChannel`) | A forced "failed" outcome on a channel that is already `DISCONNECTING` answers 409, not 500, because the 409 check comes first. | Accepted: it matches the real order of cause. |
| P4 (5/10) | `components/DisconnectConfirmModal.js` | `key={line}` assumes the lines differ. | Accepted: the rules produce no duplicates. |
| P4 (5/10) | `utils/distributionStates.js` | A channel in `DISCONNECTING` shows the hint even when the host opens the tab long after it started, because the tab never polls. | Accepted: the hint tells the host to click Refresh, which stays true. See open question 9. |
| P4 (5/10) | `utils/disconnectErrors.js` | The structure repeats `utils/enableErrors.js`. | Accepted: the two tables differ (there is no 400 or 422 here). A shared helper is the follow-up if Sonar flags the repetition. |
| P4 (5/10) | `hooks/useDisconnectFlow.js` | The failure is logged before the mounted check, so an unmounted flow still logs. | Accepted: harmless. |
| P4 (5/10) | `components/DisconnectFlowLayer.js` | The status sentence names the platform ("Turning off Booking.com…") while the badge says "Turning off…". | Accepted: deliberate, so the two strings stay distinct. |

## Architecture and data flow

Level: component. The step machine is in a hook, the rules are pure, and the section places what the hooks say.

```text
PlatformCardsSection ──▶ useHostDistribution ──▶ hostDistributionApi (getHostListings, refreshChannels)
  │                         exposes refresh and applyListing
  ├──▶ useConnectFlow    (B1, B2; gains clearError)
  ├──▶ useDisconnectFlow({ refresh, applyListing }) ──▶ hostDistributionApi.disconnectChannel
  │                                                └──▶ utils/disconnectErrors.js (classifyDisconnectError, pure)
  ├──▶ PlatformCard x3      state from describePlatformCard(listing, otaCode, { turningOff })
  ├──▶ ConnectFlowLayer     (B1, B2)
  └──▶ DisconnectFlowLayer ──▶ DisconnectConfirmModal ──▶ utils/disconnectConfirm.js (pure)
```

```text
idle ──start(platform, channel)──▶ confirm ──Turn off──▶ disconnecting ──answer──▶ idle, the answered listing applied
  ▲                                  │                         │                     (or one refresh if it is not this listing)
  └─────────── Cancel ───────────────┘                         └─ error ─▶ idle, with the message of that class;
                                                                            a 404, 409 or 5xx also refresh(propertyId) once
```

What the card says over time:

```text
Live / Syncing / Needs attention ─▶ switch off ─▶ "Turning off…" (request runs, everything locked)
   ─▶ answer: "Disconnecting…" + "This takes about a minute. Click Refresh to see the result."
   ─▶ Refresh (the worker has finished): "Disconnected", switch usable, turning it on runs the connect flow
```

## State rules for the card switch

| Card state | Switch | Turning it |
|---|---|---|
| Not connected, Disconnected | off, enabled | on: the connect flow (B1, B2) |
| Syncing…, Live | on, enabled | off: the confirm |
| Needs attention, "disconnected outside Domits" (proposed) | on, enabled | off: the confirm with its own text |
| Needs attention, any other state, including an unknown one (proposed) | on, enabled | off: the confirm. It retries the disconnect. |
| Disconnecting… | off, locked | none |
| Setting up… | off, locked | none |
| Turning off… (this request is running) | off, locked | none |

While any flow is open the other two switches, the picker and Refresh are locked as well.

## Mock shapes (proposed, to confirm with Enes)

```text
disconnectChannel({ channelId }) -> { listing }          POST /host/channels/{channelId}/disconnect
  success:               the channel becomes DISCONNECTING and the answer comes at once (D5)
  already DISCONNECTED:  the listing comes back unchanged (idempotent)
  errors: 404 CHANNEL_NOT_FOUND, 409 DISCONNECT_IN_PROGRESS, 500 DISCONNECT_FAILED
channel.upcomingBookingCount                              PROPOSED: upcoming bookings from this OTA, for the dialog
MOCK_DISCONNECT_OUTCOME = "success" | "in-progress" | "not-found" | "failed"
```

"in-progress" stores `DISCONNECTING`, "not-found" removes the channel, and "failed" stores `ERROR` with a `lastErrorCode`, so the Refresh after the error shows what a backend would have left behind. The mixed fixture now has its own channel ids, because a lookup by channel id across listings needs unique ids (a test pins that).

## What already exists

- `ChannexModalShell`, `modalTestHelpers.DISMISS_ACTIONS` and the button and note classes are reused by the confirm modal.
- The step ref, the mounted ref and the "answer is for this listing" rule from the enable flow are reused in the disconnect hook.
- `useHostDistribution.refresh` and `applyListing` are reused as they are.
- `PlatformCard` already had `turnOffEnabled` (B1); the section now passes it.
- `describePlatformCard` stays the one place that decides what a card says; "Turning off…" and the hint went into it.
- The old account-level `DisconnectChannexModal` is untouched. The new modal is `DisconnectConfirmModal`.

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| Disconnect answers 409 (already in progress) | Util, hook and section tests | The listing is read again and the card says "Disconnecting…". No alert. |
| Disconnect answers 404 (the channel is gone) | Util, hook and section tests | The listing is read again and the card says "Not connected". No alert. |
| Disconnect answers 5xx | Util, hook and section tests | One alert, "We couldn't turn this off. Try again.", and the listing is read again, so the card shows what was left (for example "Needs attention"). |
| Network error, or a status that says nothing about the channel | Util, hook and section tests | One alert, the card unchanged, no refresh. |
| The answer has no listing, or one for another listing | Hook tests | The listing is read again once, and nothing wrong is put in the list. |
| Double click on Turn off | Hook test | The step ref ignores the second call: one request. |
| Unmount while the request runs | Hook tests | The answer is ignored, nothing is applied or refreshed. |
| A connect and a disconnect started together | Section tests | The second cannot start: switches, picker and Refresh are locked. |
| A stale message from the other flow | Section test | Each flow clears the other's message when it starts. |
| The refresh after an error fails | Existing refresh tests | "We couldn't refresh your connections." for that listing. |
| A disconnect that never finishes in the worker | Not detectable here | D5 sends it to `ERROR` after the retry limit, and the card then reads "Needs attention" on the next Refresh. |

None is a critical gap.

## Not in scope

- The backend side of D5 and D9: the ordered close then deactivate, the outbox hold, and the automatic disconnect of a listing that stops being live. The frontend only starts the disconnect and shows the result.
- Polling. The design note says Refresh only (D7), so the hint tells the host to click it.
- The route guard (`feature/506-distribution-route-guard`). It must land before any real route is wired. The flag must stay off until the real routes and the guard are in.
- Final copy and design (Ilan). The sentences in the confirm and the hint are placeholders for him.
- Whether the "I will disconnect only with the switch on this page" checkbox moves responsibility to the host. That is for the terms of service (D5).
- Removing the old account-level components, after the real routes exist.

## Open questions

For the pull request description.

1. What does disconnect answer: `{ listing }`, `{ channel }`, or an empty 204? The frontend assumes `{ listing }` and reads the listing again once if the answer is not usable.
2. Does Refresh, which reads the channels from Channex, leave a `DISCONNECTING` row alone while Channex still reports the channel active? If it resets the row to `ACTIVE`, the card would flip back. The same question applies to `GET /host/listings`, and to the 409 case, where the frontend reads the listing again and expects "Disconnecting…".
3. What does a 500 leave behind: `ERROR`, or the row unchanged? The mock stores `ERROR`.
4. Can the host turn off a "Needs attention" channel? The plan says yes for both cases. For "disconnected outside Domits" that depends on the backend treating an already-inactive channel as success. Or should that case offer only Refresh and a reconnect?
5. Are `CHANNEL_NOT_FOUND`, `DISCONNECT_IN_PROGRESS` and `DISCONNECT_FAILED` the real codes? The frontend decides by status only.
6. What are the real name and meaning of `upcomingBookingCount`? D5 says it counts bookings by `booking_source`, and it is not clear whether it is per OTA and per listing.
7. D5 accepts that the listing's other OTAs are closed for about two minutes during a disconnect. Should the confirm text say so? D5's own text does not.
8. Should "Turning off…" show only while the request runs, with "Disconnecting…" afterwards (as built), or should the card use only D7's "Disconnecting…"?
9. After the answer the card says "This takes about a minute. Click Refresh to see the result." Is that the wording and the mechanism wanted, given that there is no polling (D7)? Enes can change it.
10. The flag must stay off until the real routes and the route guard land.

## Test results

- The distribution folder: 27 suites, 439 tests, all passing (it was 23 suites and 343 tests at the end of B2).
- New in this PR, 96 tests in all: the mock (12), the confirm text rules (16), the confirm modal (12), the error table (8), the card state rules (5), the disconnect hook (22) and `clearError` (1), and the section (20 new tests; one old test also changed, because switches that are on are now usable).
- The full web suite: 288 suites passed, 1 failed. 3944 tests passed, 9 failed, 47 skipped.
- The 9 failures are the known ones in `src/features/bookingengine/listingdetails/pages/listingDetails2.test.js`, also failing on the base of the stack, and unrelated to this change.
- Deliberate breaks checked against the tests, each caught: the 409 rule, the singular form, the "Turning off…" state, the double-click guard, the mounted guard, the same-listing check on the answer, the switch lock, the picker lock, the Refresh lock, `turnOffEnabled`, and both stale-message clears.
