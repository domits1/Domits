# Host reputation dashboard

Pull request: not opened
Issue: supplied host reputation dashboard story
Reviewed commit: f9325c172 plus working tree changes
Result: separation and responsive findings fixed; independent design review performed.

## What already exists

Reuse the host dashboard Reviews route, authentication, view navigation,
`requestReview`, `RatingStars` and the received-review card shell/styles.
The existing backend's authenticated `host-dashboard` scope returns overall
and category aggregates plus bounded, recent-first published host reviews.
No backend, schema, Gateway or dependency changes are needed.

## Findings and decisions

- [P2] (confidence: 10/10) `frontend/web/src/features/review/views/HostReviews.js:94` previously assigned `setReceivedReviews(data)` without a type filter. The generic received API can return host reviews, allowing them to affect the property view's average. Fixed by retaining property types (and legacy entries without a type) in the Property Reviews view; added a mixed-type regression test.
- `backend/functions/ReviewSystem/data/publicReviewRepository.js:43` requires `VERIFIED_STAY` for every host-dashboard result. Verified-stay badges use this endpoint guarantee rather than inferring verification from a review's text or rating.
- The backend host projection omits guest names and stay dates. Use Guest and the actual review date; do not invent the reference design's personal metadata.
- Existing response authorization supports property reviews only. The design's Reply controls are disabled with explanatory tooltips, while property response forms remain unchanged.
- [P2] (confidence: 8/10) `HostReputation.module.css:38`: a wide six-column grid could clip actions at intermediate widths. Fixed with horizontal overflow at all widths and an earlier two-column summary breakpoint.

Architecture, code quality, tests and performance were reviewed. The new view
does not recompute host averages from the current page or make per-review calls.
The shared card extraction preserves the existing article attributes and styles.

## Interface and visual decisions

- Open Host Reviews by default with two underlined page tabs. Keep property performance/trend tools inside Property Reviews. Per the user's follow-up, the sidebar has only the main Reviews link and no review sub-tabs.
- Follow the reference's four reputation cards, green service icons, gold stars, recent feedback rows and pagination.
- The Most recent selector exposes only the ordering supported by the API.
- Use bounded server pagination with numbered pages, Previous/Next and a current-page indicator.
- Keep all summaries supplied by the host-specific endpoint; null averages display No ratings yet.
- Responsive grids collapse to two then one summary column, with review cards stacking on small screens. Native buttons, descriptive regions and page-change focus support keyboard/screen-reader use.
- Read requests contain only `scope=host-dashboard`, limit and offset. The backend derives ownership from authentication; the client also rejects a response for a different host.
- Render only known public title, review, rating and date fields. Private guest feedback and ownership identifiers are not displayed.

## Failure modes

| Failure | Test and handling | Host sees |
|---|---|---|
| Missing authenticated account | Parent auth guard test | Login navigation, no host fetch |
| Wrong host or malformed payload | API contract tests and shape/identity validation | Load error |
| API failure or denied access | Error/retry and 403 tests | Alert with retry |
| No reviews/category data | Empty/null-score tests | Empty state and No ratings yet |
| More than one page | Server pagination test | Next/Previous; global scores unchanged |
| Account changes during request | Deferred-response test and effect cleanup | Late old response ignored |
| Mixed generic property/host response | Type filter regression test | Property-only list and average |

## Data flow

```text
Authenticated Host Dashboard ▶ Reviews ▶ Host Reviews
  ▼
host-dashboard request ▶ response host/shape validation
  ▼
Overall + service-category summaries ▶ shared public review cards
  ▼
Bounded server pagination, independent of property performance
```

## Not in scope

- Backend, database and Gateway: frontend-only constraint.
- Guest identity/stay dates and host reply support: not available in the current host API contract.
- Replacing property performance or changing existing reply eligibility: preserve the existing views.
- Shared site-header redesign: retain existing global application navigation.

## Validation

React/Jest tests cover summaries, published feedback, private-field exclusion,
verified indicators, loading/empty/error/retry, identity validation, pagination,
authentication and host/property separation. Existing response/performance/card
tests are retained. Browser screenshot and mobile/tablet/desktop visual checks
have not been performed; responsive rules are included. `git diff --check` passed.
The final design regression run passed 51 tests across five suites. The subsequent sidebar-link test run passed all 22 sidebar tests, bringing the covered total to 52 tests.
The layout now includes the six design columns, pastel avatars, disabled reply controls, larger overall score, service icons and bounded numbered pages. Live pixel comparison remains unverified.
