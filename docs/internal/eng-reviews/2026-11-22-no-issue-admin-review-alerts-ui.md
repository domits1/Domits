# Administrator review notification UI

Pull request / issue: not provided
Reviewed commit: a7dd19b48
Base: 2fca65284 (stacked feature parent)
Result: one P2 finding; fix approved, implementation pending. No runtime changes made during review.

## Findings

[P2] (confidence: 9/10) frontend/web/src/features/hostdashboard/notifications/ReviewAlertsProvider.js:49: loading the entire alert history blocks the administrator notification UI.

Evidence:
- ReviewAlertsProvider.js:38 sets `busy.current = true` and line 40 sets `loading: true`.
- Line 50: `result = await requestAlerts(`?limit=50&offset=${cursor}`);` (no status filter).
- Line 52: `records.push(...result.alerts); cursor += result.alerts.length;`
- Line 54: `} while (administrator && result.alerts.length === 50);`
- Lines 59-60 publish the alerts and clear loading only after the entire loop.
- Line 66: `if (busy.current || mutating.current || (administrator && !data.current.allowed)) return false;`
- backend/functions/ReviewSystem/data/reviewAlertRepository.js:50 filters only by recipient when status is omitted, so READ and DISMISSED history is included; lines 47-48 allow an existing status filter.

Every initial load and visibility refresh makes serial requests for the complete
recipient history, including unrelated host/guest alerts and dismissed records.
Request count and memory grow with lifetime history rather than the visible page
or unread workload. Until the final page arrives, the dropdown shows loading,
the list has no newly fetched rows, and read/dismiss actions are blocked. A late
page failure prevents display of already retrieved first-page notifications.
The host view previously loaded a bounded page; the administrator branch removes
that bound. Existing tests cover two pages, not slow/large historical backlogs.

Recommendation: retain bounded list pagination and make the first page usable
without waiting for history. Compute the exact administrator unread count using
the existing UNREAD filter in an independent request flow, so read/dismiss actions
are not blocked by counting. Preserve count consistency when actions overlap a
count refresh. Add coverage with a large dismissed backlog and a delayed later
request, plus count reconciliation after actions.
Decision: user approved option A: retain bounded list pagination and independently load the scoped unread count using the existing UNREAD filter, with action/count reconciliation coverage. Implementation pending; no runtime fix applied during review.

## What already exists

Reuses NotificationBell, NotificationDropdown, ReviewNotifications, one shared
provider and getIdToken. Existing authenticated GET/PATCH alert endpoints and
hasReviewApprovalAccess provide data and backend-verified administrator access.
No backend/database changes, dependencies or global styles are introduced.
The existing exact review-approval route guard also protects the query-based
notification page. Safe summaries project IDs/type/status/time; raw review text,
private feedback and server-provided destinations are not rendered.

## Failure modes

| Path / failure | Coverage | Handling / visible result |
|---|---|---|
| Approval permission false or unknown | Covered | No alert fetch, hidden bell, access error/retry |
| Permission lost during mutation | Covered | Old alerts/count cleared and bell hidden |
| Account switches during pending load | Covered | Generation guard discards stale account data |
| Read/dismiss API failure | Covered | State/count retained; error and retry |
| Concurrent dismissal returned by read | Covered | Removed row and adjusted count |
| Mixed alert types, duplicate pages | Covered | Administrator filtering, deduplication and scoped count |
| Large/slow historical pagination | Missing | Full scan blocks list/actions; P2 above |
| Review link to publication on later loaded review page | Covered | Correct tab, page and selected review |
| Flag link target outside first flag page | Not covered | Moderation view opens; selection waits until target page is loaded |
| Keyboard dropdown close | Covered | Escape closes and returns focus to bell |

## Diagrams

    Header bell + administrator notification list
                         |
                         v
    shared provider -> backend approval-access check -> authenticated alert API
                         |
                         v
    safe administrator summaries + shared unread/read/dismiss state
                         |
                         v
    existing approval route + tab/review query -> approval/moderation/publication

## Not in scope and decisions

- Backend type-filtered counts: forbidden by frontend-only scope. Existing status filtering can avoid scanning historical read/dismissed records for unread counts.
- Backend recipient-ID issues from earlier branches: not changed or certified by this UI review.
- New notification components or route guards: reuse existing components and the protected approval pathname instead of duplicating host infrastructure.
- Visual responsive QA and screenshots: previous browser verification stopped because the tool could not determine the local Edge URL. Mobile/tablet/desktop visual checks remain unverified; existing responsive CSS is retained.
- Flag lookup by exact review across server pages: current links reach the correct moderation view, with selection on a loaded matching page; no new backend lookup endpoint is introduced.
- Entire acceptance stack: review covers a7dd19b48 against its feature parent, not the 135-file acceptance comparison.

Architecture decision context: shared provider/list/bell preserves host behavior
and avoids a second implementation. The administrator route supplies a mode and
permission boundary. Counting requires a separate strategy because the API count
includes multiple alert types; the proposed fix retains frontend-only scope.

## Verification

Architecture, code quality, tests and performance passes completed. Four targeted
Jest suites passed (68 tests): administrator notifications, shared provider,
approval page and protected route. git diff --check passed. The independent
review was attempted as required, but the sub-agent failed before reviewing due
to the account usage limit; no independent agreement is claimed. The feature
contains 246 changed lines before this report and remains below 500 including it.
