# feat(property): show review history on the admin review detail (#3302)

Pull request: not opened yet
Issue: #3302
Reviewed commit: 4044db41f plus the uncommitted working tree
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (6/10) | propertyService.js:627-630 | The history read sits in the same Promise.all as the property read, so a failing history query turns the whole review detail into a 500. | Accepted: the detail page is only useful with its history, a silent empty list would hide a real failure, and the table is already written by every status change. |
| P4 (5/10) | propertyRepository.js:246 | The 50-row cap drops the oldest events without telling the caller. | Accepted: agreed on the issue, a listing realistically has 2 to 10 events. |

## Verified

- `history` is added only in getFullPropertyForReview. Moving the merge into the shared builder makes 9 tests fail, including getFullPropertyByIdAsHost and getFullActivePropertyById, so the host and public routes cannot leak actorId unnoticed.
- The route stays admin-only: authorizeReviewAdminRequest runs before the service call and its tests are unchanged.

## Not in scope

- Showing the history in the admin page: separate frontend pull request.
- Resolving actorId to a name or email: admins see the id, a lookup costs a Cognito call per actor.
- Host-facing rejection data (PR #3784): it needs its own projection without actorId.
