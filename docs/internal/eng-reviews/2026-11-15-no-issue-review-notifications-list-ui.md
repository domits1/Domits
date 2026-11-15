# Review Notifications list UI

Pull request / issue: not supplied
Reviewed base: f64e0d040 (origin/feat/review-alerts-notification-ui)
Reviewed target: current branch feat/review-alerts-list-ui, including uncommitted
changes and the three untracked ReviewNotifications files.
Result: one P2 finding fixed; browser validation incomplete.

## Findings

[P2] (confidence: 8/10) frontend/web/src/features/hostdashboard/notifications/ReviewNotifications.js:77 (pre-fix):
keyboard pagination does not hand focus to newly revealed notification links.
Evidence: `{visible.length < filtered.length && <button type="button" onClick={() => setLimit(limit + PAGE_SIZE)}>Load more notifications</button>}`.
Rows are rendered before this footer (lines 45-74), so new links precede the
focused button. Tab skips them; the final batch removes the focused button.
The pagination test (ReviewNotifications.test.js:22-25) clicks the button and
asserts row count/button removal, without asserting focus after activation.
Decision: user approved fixing focus and adding keyboard tests. The load-more
handler records the first new row index; an effect focuses its link after render.
A regression test covers Enter on an intermediate batch, Space on the final
batch, and subsequent Tab navigation through the newly added links.

## Architecture

Frontend-only props boundary: MainDashboardHost supplies alerts/loading/error;
the page filters and sorts without mutating supplied data. No API is called.
The routed default is an empty state until a caller supplies alert data.
Existing property routing is reused: HostPropertyEditor.js:86-87 reads `ID`.
No review-detail deep-link contract exists here; links use the relevant property
dashboard when propertyId exists, otherwise the existing host reviews route.

## What already exists

Reuses notificationTypes and icon/status styles from the bell, review page
heading styles, host routing/sidebar conventions, and React Router links.
The dropdown adds an anchor to the full list; unlike the list's Link actions,
this triggers a document navigation. A future shared in-memory data provider
must account for that navigation when PR 8 wires both surfaces.

## Code quality, tests and performance

Explicit six-filter model; textual type and status prevent color-only meaning.
Missing rating/date values have visible fallbacks; React escapes supplied text.
Filtering produces a copy before sorting. Filter changes reset the five-row limit.
Runtime is O(n log n) sorting plus six O(n) filter counts; suitable for a small
supplied list. Server pagination and large-feed optimization belong to integration.
Focused suites cover rendering, all filters, ordering, load more, keyboard filter
activation, navigation, state branches and malformed optional display values.
Keyboard load-more focus now has a regression test. Routed-shell integration
is not covered by these focused suites.

## Failure modes

| Path / failure | Test | Handling / visible outcome |
|---|---|---|
| Loading / error | Yes | Status / visible alert; caller owns recovery |
| No data / filter matches | Yes | Distinct empty status messages |
| Missing rating / invalid timestamp | Yes | Explicit fallback text |
| Data sorting / load more | Yes | Newest first; sliced list and live count |
| Filter change after pagination | Yes | Limit resets to five |
| Keyboard load more | Yes, intermediate/final batches | Focus moves to first new link |
| Property ID contains reserved characters | Yes | Encoded existing property route |
| Narrow viewport / long property text | Text assertion only | CSS wraps; browser fit unverified |

## Data flow

    MainDashboardHost props ▶ ReviewNotifications
                                  ▼
                          filter ▶ newest first ▶ visible slice
                                                    ▼
                                         property / reviews Link

## Not in scope

- Backend integration and persisted read actions: explicitly reserved for PR 8.
- Search, property/date filters and bulk selection from the image: not requested.
- Backend alert shape: future adapter maps it to the documented UI props.
- Unrelated dashboard refactoring: excluded to preserve the 400-line limit.

## Independent opinion and validation

Independent reviewer identified the same pagination focus issue; no substantive
disagreement. The user-approved focus fix was implemented after the review.
Browser verification previously stopped because Computer Use could not reliably
determine the current browser URL on Windows. Responsive checks remain pending;
the long-property Jest assertion is not evidence that the rendered layout fits.
Before the fix: two suites, all 15 tests passed (ReviewNotifications and NotificationBell).
Post-fix rerun: two suites, all 16 tests passed, including the focus regression test.
React Router emitted future-version warnings; no test failures.
Diff whitespace check passed. Review plus implementation remains below 400 lines.
