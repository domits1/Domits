# Guest reservation review form and history

Reviewed base `3e400feb4` and the working diff. Issue and PR numbers were unavailable.
Result — no blocking findings after resolving API compatibility, history state, and account-change handling.

## Findings

| Severity and confidence | Evidence | Decision |
| --- | --- | --- |
| P1 (10/10) | `backend/scripts/seed-reservation-review-categories.sql:8–10` defines `booking_experience`, `reservation_communication`, and `booking_accuracy`. `backend/functions/ReviewSystem/business/service/reviewService.js:18` sets `REVIEW_MAX_LENGTH = 500`. | Use the configured categories and 500-character limit in the reference layout. Supply a fixed reservation title because the API requires a headline. |
| P2 (10/10) | The existing linked history read sends `{ reviewId: targetId, view: "history" }` in `frontend/web/src/features/review/views/GuestReviews.js:119` at the base. The repository defaults to `reviewType = "GUEST_TO_PROPERTY"` in `backend/functions/ReviewSystem/data/reviewRepository.js:55`. | Send explicit type for reservation detail and remove the linked card after deletion. Pass the data-derived type to the existing draft editor for presentation. |
| P2 (9/10) | The base eligibility effect in `frontend/web/src/features/review/views/ReviewPage.js:195` depends on the route and navigation state. The history view already listens to `"authChanged"`. | Recheck eligibility after an account change and remove reservation context while it is being checked. The independent reviewer also confirmed that written history is already ownership scoped and that publication copy should describe authorized feedback access. |

## Architecture and existing components

Keep one form, reuse its rating controls and authenticated create/publish flow, and use the existing written-history response for the new card label. This adds no history request to the booking form and no second list request for reservation reviews. Only an explicit detail link requests an individual review. The backend remains authoritative for booking ownership, eligibility, duplicate conflicts, and edit permissions.

```text
Owned completed booking ▶ select reservation ▶ create typed draft ▶ submit for approval
Authenticated written history ▶ labeled card ▶ existing eligible edit/delete actions
```

## Failure modes

| Failure | Handling and verification |
| --- | --- |
| Ineligible booking or changed account | Hide the form while eligibility is checked. Tests cover a mismatched guest and account change. |
| Duplicate or transient request failure | Keep the input and show the API error. A 409 disables the reservation option for the current form instance, while a transient error permits retry. Tests verify each case. |
| Draft save succeeds but approval submission fails | Keep the draft ID and retry approval via the existing flow. Shared publication retry tests verify that the UI does not create another draft. |
| History detail denied or deleted | Existing errors conceal inaccessible content. Tests cover typed detail and removal after deletion. |

Browser layout checks used a fixture rendered from the reservation form at the 695-pixel reference width and a 390-pixel mobile viewport.

## Scope exclusions

- Backend configuration, database schema, and rating aggregates remain outside this frontend change.
- The reference supplies the visual layout. Category names, the character limit, and review visibility follow the deployed API contract.
