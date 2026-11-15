# fix: byCountry pagination cursor sends createdAt and id #3302

Pull request: not opened yet
Issue: #3302
Reviewed commit: 972a430f5 plus the uncommitted working-tree diff (nothing committed or staged yet)
Result: 1 finding, fixed in this diff (P2, made reachable by the cursor fix)

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | frontend/app/Domits/src/screens/home/screens/Home.js:212 (before) `onSearchButtonPress={fetchPropertiesByCountry}` and :89-93 (before) `fetchPropertyByCountry(country, byCountryLastEvaluatedKey.createdAt, byCountryLastEvaluatedKey.id)` | The search button called the same function as load-more and sent the cursor still in state. The cursor was only reset in `fetchProperties` (Home.js:60-61), not on a new search. Before the cursor fix the server ignored the cursor, so a second search repeated page 1. With the fix, searching country A and then country B sent A's cursor, so B skipped every property newer than A's last item, and B's results were appended to A's list. Wrong results with no error. | Fixed in this diff. `fetchPropertiesByCountry(country, isNewSearch = false)` resolves the cursor (`{createdAt: null, id: null}`) and the previous list (`[]`) from the flag inside the closure, so a new search does not depend on state that has not re-rendered yet. The search button passes `true`; load-more passes nothing. `propertiesByCountry` is added to the `useCallback` dependencies, which also closes a stale-list trap. Option A (reset the state, then call the same function) was rejected: the call would still read the old state from its closure. |
| P3 (6/10) | frontend/app/Domits/src/screens/home (no Home test) | The state handling in Home.js had no test. | Fixed in this diff: `home.countrySearch.test.js` renders the real `HomeScreen` and `Header`, searches Spain and then France, and asserts that only France's cards show and that France's request carries a null cursor. |

## Not in scope

- Old mobile builds keep sending `{id, city}` and stay broken. Context: they are already broken today, so this is not a new regression. Options weighed: a server fallback that looks up `createdat` from the id, or nothing. Choice: nothing. Consequence accepted: users on old builds see repeated first pages until they update.
- The 404 "No property found" at the end of pagination. Pre-existing and identical for the "all" feed.
- `getActivePropertyCardsByCountry` in the service capitalises the country by hand. Unrelated to the cursor.
- The other `exhaustive-deps` warnings in Home.js (`propertyRepository`, `t`, the mount `useEffect`) and the existing Prettier and lint findings in `propertyRepository.js` and `testPropertyRepository.js`. They were there before this change, and fixing them would reformat unrelated lines.

## What already exists

- The "all" feed controller (`getActivePropertiesCard`) already parsed `lastEvaluatedKeyCreatedAt` with `parseFloat` and `lastEvaluatedKeyId`. The fix reuses that shape and does not add a helper. The parsing is now repeated in two controller methods; a third caller would be the point to extract it.
- The repository and the paginated mapper already read and return `{createdAt, id}`; no change was needed there.
- `routing-unit.test.js` already routed `byCountry`; the new spec entry only closes the coverage gap.
- `fetchProperties` already reset the by-country state when the user went back to the "all" feed. The new flag does the same for a new search.

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| controller cursor parsing | first page sends no cursor or the string "null" | yes | `parseFloat` gives `NaN`, which is falsy, so no cursor predicate | yes, page 1 as expected |
| controller cursor parsing | client still sends `{id, city}` (old build) | no | `createdAt` is `NaN`, no predicate, page 1 repeats | no, same as today (accepted above) |
| mobile search after a previous search | stale cursor or list from another country | yes | `isNewSearch` resets both for the request | yes, only the new country's results |
| mobile load-more | cursor of the current search is sent | partly: the repository test checks the URL, the Home test checks only the search path | cursor and list come from state | yes, the next page is appended |

No critical gap is left. The load-more path in Home.js has no test of its own; the repository test and the controller test cover its two ends.

## Verification

- The new controller test failed against the old `{id, city}` parsing (expected `createdAt: 1700000000123`, received `city: undefined`), and the mobile repository test failed on both assertions before the fix.
- The Home test failed before the Home.js change: France's request carried Spain's cursor (`111`, `spain-2`) instead of nulls. It passes after.
- Mutation check on the controller: the old two lines were put back in a scratchpad copy (sha256 `a73fcaf8…` original, `c00a1001…` mutant). The copy was swapped in over the controller to run the test, and the original was restored (sha256 `a73fcaf8…` again). The controller test failed with the mutant.
- Mutation check on the `isNewSearch` gate: the cursor and the previous list were forced to ignore the flag in a scratchpad copy (sha256 `19061a8e…` original, `75fa4cea…` mutant). The copy was swapped in over Home.js to run the Home test, and the original was restored (sha256 `19061a8e…` again). The Home test failed with the mutant.
- The failing suites in the backend (7 suites, 27 tests) and in the mobile suite are the same ones as before this change, none of them touch these files.
