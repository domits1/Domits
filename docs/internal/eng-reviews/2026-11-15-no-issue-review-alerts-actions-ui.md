# Review alerts actions UI

Pull request: not yet opened
Issue: not supplied
Reviewed base: 26ab80cd6 (feat/review-alerts-actions-ui)
Reviewed target: uncommitted working-tree changes, including the untracked
ReviewAlertsProvider.js and ReviewAlertsProvider.test.js.
Result: no blocking findings; one P2 finding fixed, one P2 accepted, four P3 findings recorded.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | ReviewNotifications.js:92-93 (pre-fix) | A 401/403 from the alerts API rendered "No review notifications yet.", so a host with an expired session could not tell loading had failed. Only the bell dropdown showed an error. | Accepted by the author after a first fix: the sign-in status line was removed again. On an authorization error the page shows the normal empty state, "No notifications yet.", matching the bell. The test asserts that empty state and that no alert appears. |
| P2 (7/10) | ReviewNotifications.js:28 (pre-fix) | With nothing selected, bulk read/dismiss acted on every loaded alert and ignored the active tab, search and filters. Dismiss cannot be undone in the UI. | Fixed: without a selection, bulk actions target the filtered list, and the buttons read "Mark matching alerts as read" / "Dismiss matching read alerts". A new test covers the filter-scoped bulk action. |
| P3 (10/10) | ReviewNotifications.js:19-20 | Stale comment: "this page performs no requests", but the page now calls `live.update`. | Open, not blocking. Update the comment in a follow-up refactor commit. |
| P3 (9/10) | ReviewAlertsProvider.js:19-20 | `requestAlerts` reports "Could not update notifications" for every failure, including the initial GET load. | Open, not blocking. Copy issue only. |
| P3 (7/10) | ReviewAlertsProvider.js:39 | Dismissed rows come back from GET (reviewAlertRepository.js:50 has no status filter by default) and are filtered in the browser. A host who dismisses a lot can get a first page that is entirely dismissed, which shows the empty state next to "Load more". | Accepted for now. The proper fix is a backend status filter (see Not in scope). |
| P3 (7/10) | ReviewNotifications.js:31-33 | Bulk actions send one PATCH per alert, sequentially: N round trips. | Accepted: bounded by the 50-row page. Revisit if a bulk endpoint is added. |

Ruled out during review: `created_at` producing an invalid date (it is a bigint column with a
transformer, so `Number()` is safe), and load-more skipping rows after a dismiss (the server
offset counts dismissed rows too).

## Architecture

One `ReviewAlertsProvider` at App level owns fetching, paging, unread count and read/dismiss
mutations. It is active only on `/hostdashboard` routes. The bell and the notifications page
read the same context, so they never fetch independently. A generation counter discards
responses that arrive after an `authChanged` reset or unmount.

    authChanged / route ▶ Provider.load ▶ GET /reviews/alerts ▶ adapt ▶ context
                                                                    ▼
                                             Bell (count, dropdown)  ReviewNotifications
                                                                    ▼
                                                     update ▶ PATCH /{id}/{read|dismiss}

## What already exists

Reuses `getIdToken`, `API_REVIEW_BASE`, the backend paging and `unread_count`, and the existing
bell and list components (both still accept props when no provider is mounted). No view is rebuilt.

## Failure modes

| Path / failure | Test | Handling / visible outcome |
|---|---|---|
| Load fails (500) | Yes | Alert with Retry |
| Load fails (401/403) | Yes | Empty state "No notifications yet."; no error on the page (accepted) |
| Read/dismiss fails | Yes | Rows and count kept; alert with Retry |
| Auth change during a request | Yes | Stale response ignored; data cleared |
| StrictMode double mount | Yes | Single request |
| Bulk action under a filter | Yes | Only matching alerts change (fixed in this review) |
| Page of only dismissed rows | No | Empty state with Load more; see P3 above |

## Not in scope

- Excluding DISMISSED alerts in the backend list query: a ReviewSystem Lambda change, outside this frontend PR.
- Real property names instead of `Property <id>`: needs a property lookup the alerts API does not return.
- A bulk read/dismiss endpoint: not needed at the current page size.

## Validation

Full web Jest suite after the fixes: 275 suites passed (6 skipped), 3621 tests passed
(47 skipped), no failures. After removing the sign-in line, the hostdashboard tests passed
except panoramaSitePages.test.jsx, which failed once under load and passed 40/40 on its own. Search bar styling was checked
in tests only; the rendered layout has not been verified in a browser.
