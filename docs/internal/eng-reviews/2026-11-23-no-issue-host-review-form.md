# Dedicated guest host review form

Pull request: not opened
Issue: supplied guest host review form story
Reviewed commit: e6116d62d plus working tree changes
Result: no blocking findings; independent reviewer identified two minor items addressed below.

## What already exists

Reuse ReviewPage, its booking ownership/completed-stay check, native star radios,
validation, loading/error states, API submission and saved-draft moderation retry.
Existing reservation navigation already opens this page with canonical Booking.id;
the new selector makes both review types available from that entry point.

## Findings and decisions

Architecture, code quality, tests and performance reviewed. No new dependencies,
backend calls for eligibility, backend changes, tables or global styles.

- [P3] (confidence: 9/10) `frontend/web/src/features/review/views/ReviewPage.js:389`: host confirmation originally always said awaiting approval. Fixed to use the returned pending/published state, matching the existing API contract.
- `backend/functions/ReviewSystem/data/reviewRepository.js:61` retains a property-only guest-history filter. Backend changes are excluded from this story. The host success action now says Back to reservations instead of implying the new host review appears in history.

## Design decisions

- Native Property Review / Host Review radio cards provide keyboard selection and wrap on narrow screens. Reuse the current focus indicators and star controls.
- Host categories are Communication, Responsiveness and Hospitality. Switching types clears form/category/error state so property feedback is not sent as host feedback.
- Keep the required title and 500-character written-review limit supported by the backend, despite the reference image showing 1000 characters.
- Only host submissions add `review_type: GUEST_TO_HOST`; existing property request payloads remain unchanged.
- A synchronous submission lock prevents rapid repeated submits; controls are disabled while saving. A 409 disables that review type while allowing the other subject to be reviewed.
- After creation, reuse the saved draft's ID for moderation submission and retry. No direct publication or moderation bypass is introduced.
- Local completion state prevents repeat submissions while reviewing the other subject. Across refresh/navigation, the existing backend uniqueness constraint remains authoritative.

## Failure modes

| Failure | Coverage and handling | Guest sees |
|---|---|---|
| Session/loading or ineligible stay | Existing page eligibility tests and booking checks retained | Loading or unavailable state |
| Missing overall, title, written review or category | Host validation tests and shared validation | Inline alert; rating/text/category focus |
| Server rejection | Host API error test preserves input | Retryable error |
| Duplicate or rapid click | Conflict and repeated-submit tests; lock/status handling | Disabled submission for the reviewed type |
| Moderation request fails after creation | Host saved-draft retry test | Retry existing draft without another create |
| Type switch leaks property categories | Category isolation test | Fresh subject-specific form |
| Keyboard-only guest | Native radio keyboard test | Selectable review type and rating controls |

## Data flow

```text
Completed reservation ▶ existing ReviewPage eligibility
  ▼
Property Review OR Host Review ▶ shared form/star controls/validation
  ▼
createReview with optional host type ▶ saved draft
  ▼
Existing moderation submission/retry ▶ accurate confirmation
```

## Not in scope

- Backend, database, Gateway and host review history: frontend-only constraint.
- Exact reproduction of the reference image: preserve shared application layout, required title and backend text limit.
- New component framework or duplicate form: existing controls already meet the need.

## Validation

React/Jest covers type selection, categories, validation, payload, errors,
duplicate prevention, saved-draft retry and keyboard selection. Existing property
review tests remain in the same suite. Browser visual checks on mobile/tablet/
desktop were not performed; responsive support uses wrapping cards and the
existing page breakpoints. `git diff --check` passed.
The frontend regression run passed all 128 tests across seven suites, including
87 ReviewPage tests. Total change: 284 added/deleted lines, including this report.
