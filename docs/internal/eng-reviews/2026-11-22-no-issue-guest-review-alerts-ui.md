# Guest review notification dashboard integration

Pull request / issue: not provided
Reviewed commit: 5b52d5f60
Base: 6e70b6af3 (stacked feature parent)
Result: one P2 finding; fix approved, implementation pending. Review only; no runtime changes made.

## Findings

[P2] (confidence: 10/10) frontend/web/src/features/review/views/GuestReviews.js:213: a notification-linked review remains visible after successful deletion.

Evidence:
- GuestReviews.js:123: `if (active && version === session.current) setLinkedReview(review);`
- GuestReviews.js:201-204: the DELETE request succeeds, then only `setReviews((prev) => prev.filter((r) => r.id !== reviewId));` is applied.
- GuestReviews.js:213: `const visibleReviews = isWritten ? (linkedReview ? [linkedReview, ...reviews.filter(review => review.id !== linkedReview.id)] : reviews) : receivedReviews;`

A guest opens an approved/published review from its notification and deletes it.
The existing deletion handler removes the entry from reviews, but the new
linkedReview state still prepends that same entry to visibleReviews. The card
and delete button remain; another deletion returns an error for the removed
review. The history count can also disagree with the visible card.

Recommendation: clear the matching linked review on confirmed DELETE success,
without clearing it on failure. Also prevent a pending history-detail response
from restoring that deleted ID. Add regressions for deleting a linked review,
deleting while its detail request is pending, and retaining the card after a
failed deletion. All current navigation fixtures use rejected reviews, whose
delete control is deliberately hidden, so they miss this case.
Decision: user approved option A: clear the matching linked review on successful deletion, prevent pending detail requests from restoring it, and add success/failure regression coverage. Implementation pending; no runtime fix applied during review.

## What already exists

Reuses the shared ReviewAlertsProvider, NotificationBell, NotificationDropdown
and ReviewNotifications list, authenticated getIdToken/requestReview utilities,
and existing alert GET/read/dismiss endpoints. Guest history detail uses the
existing owner-scoped view=history endpoint, including rejected reviews and
published host responses. Backend ownership enforcement is retained; the client
does not send recipient IDs. Safe notification summaries omit feedback and
moderation notes. No guest sidebar notification tab is added; access is via the
bell, with a shared list destination. Host/admin modes remain in the same system.

## Failure modes

| Path / failure | Coverage | Handling / visible result |
|---|---|---|
| Guest session absent/expired | Covered | No alert fetch; sign-in error; bell hidden |
| Account changes during pending alert load | Covered | Generation guard discards old guest results |
| Account changes during history display | Covered | Previous history cleared; requests use session version guards |
| Same account refresh | Covered | Linked detail reloaded without permanent loading state |
| Read/dismiss API failure | Covered | Prior row/count retained; error displayed |
| Count scan overlaps read/dismiss | Covered | Version invalidation prevents stale count overwrite |
| Count endpoint failure | Covered | List remains usable; count unavailable and retry shown |
| Mixed/paginated role alerts | Covered | Guest types only; bounded list pagination and independent UNREAD scan |
| Inaccessible/mismatched review detail | Covered | Generic unavailable error; other guest data not rendered |
| Published versus draft host response | Covered | Only published response displayed |
| Successful deletion of linked review | Missing | Stale card remains; P2 above |
| Keyboard navigation into detail | Covered | Target article receives programmatic focus with visible outline |

## Diagrams

    guest dashboard Header bell -> shared provider -> authenticated alert API
                                       |
                     bounded list page + independent UNREAD count scan
                                       |
                     shared read/dismiss state -> trusted guest review link
                                       |
                     owner-scoped history detail -> focused My Reviews card

    authChanged -> clear guest state -> increment session/request versions
                                      -> ignore old responses -> reload current guest

## Not in scope and architecture decisions

- New notification system/sidebar tab: reuse shared components and respect the user's explicit request to remove the separate sidebar item.
- Backend/API/database changes: prohibited by this frontend-only story; existing endpoints enforce recipient and review ownership.
- Earlier administrator full-history scan issue: remains unchanged in administrator mode; guest mode uses bounded list pages and a separate unread-only scan.
- Browser visual evidence: mobile/tablet/desktop rendering was not verified. The prior computer-use attempt was blocked by URL detection; no screenshots are claimed.
- Earlier stacked work: this report reviews 5b52d5f60 against 6e70b6af3, not the 140-file acceptance comparison.

Architecture decision context: one provider and shared UI avoids duplicate host,
administrator and guest implementations. Guest counting is independent of list
loading so historical read/dismissed alerts do not block actions. Ownership is
resolved by authenticated backend endpoints, with generation guards preventing
cross-session state reuse. Guest list fetches are bounded; unread scans scale with
unread records and can retry independently. Consolidating linked/list review
state would avoid the deletion inconsistency identified above.

## Verification

Architecture, code quality, tests and performance passes completed. Independent
review confirmed the deletion regression; no substantive disagreement. Targeted
Jest verification passed: four suites, 41 tests. git diff --check passed. The reviewed feature
contains 369 changed lines before this report and remains below 500 including it.
