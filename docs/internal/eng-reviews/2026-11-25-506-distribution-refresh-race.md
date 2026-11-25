# Eng review: refresh race in useHostDistribution (#506)

Issue: #506
Review feedback: Karim, on #3982: a late refresh answer clears another listing's Refreshing…
Reviewed commit: `4f8829273`
Result: no blocking findings

## Finding

`refresh` set `refreshingPropertyId` to the listing it started for and cleared it in a `finally` that always ran. The host refreshes A, switches to B and refreshes B, and then A's late answer clears B's "Refreshing…". Refresh on B is enabled again and a second request for B can start. The failure branch had the same shape: a late failure of A set the failure message, replacing the one B's own refresh had just shown.

## Decision

Each `refresh` takes a number from a ref counter. The Refreshing state and the failure message are touched only when that number is still the latest.

- A late answer still calls `applyListing`: its data is correct for its own card, and dropping it would make the host refresh again.
- A late failure still reaches the console. It does not set the message, because the host has moved on and B's message must survive.
- A counter, not a comparison of listing ids, so a Refresh that follows the Channex iframe closing (`closeIframe` calls `refresh` for the same listing) is also covered.

## Not in scope

- The Refreshing state still holds one listing id. If B's refresh finishes first and the host returns to A while A is still in flight, Refresh on A is enabled and a second request for A can start. By the code the newer request owns the state, so the state stays right, but no test covers this path and it is still a second request. A per-listing set would remove it; that is a larger change than this review point asks for.
- The connect error shown under the next listing's cards moves to #3984, which changes where that error is shown.
- The Channex host list is not touched; it waits for Enes.

## Failure modes

| Failure | Test | Handling | What the host sees |
|---|---|---|---|
| A answers late while B is refreshing | yes | A's card updates, B's state untouched | B keeps "Refreshing…" and a disabled Refresh |
| A fails late while B is refreshing | yes | console only | B keeps "Refreshing…", no alert under B |
| B failed and showed its message, then A fails late | yes | the message stays | B's alert is not replaced |

No critical gap.

## Mutation checks

Each applied, red, then reverted: the `finally` clearing unconditionally; the failure message set unconditionally (this one first survived, which showed the missing "B's error is replaced" test, now added); the latest check always true; a late answer no longer updating its own listing (also first survived, now asserted by switching back to A).

## Tests

The distribution folder passes (303 tests). In the whole web suite one file is red, `panoramaElitePagesPin.test.jsx`, an accepted baseline. It fails the same way on clean `acceptance` without this change, but with 4 failing snapshots of 5, where it had 1 failing before `acceptance` moved on. `listingDetails2.test.js` did not fail. A first full run showed 8 failures in 5 files because a stuck background process starved the machine; the four files other than the baseline pass on their own, and a clean full run showed only the baseline.
