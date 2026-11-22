# Guest review alert candidate rules

Pull request: not provided
Issue: not provided
Reviewed commit: 21e0bbaa9
Base: 0ddabc3e4 (stacked feature parent)
Result: one P2 finding; fix approved, implementation pending. Review only; no runtime changes made.

## Scope and verification

Reviewed the three-file guest-rule diff and surrounding review/response writers,
models, authorization and alert persistence. Architecture, code quality, test
coverage and performance passes completed. Independent review confirmed the
finding below; no disagreement on the recommendation.

Current verification: five Jest suites, 167 tests passed; git diff --check passed.
The preceding implementation run also passed all 35 ReviewSystem suites / 822 tests.
The feature diff contains 170 changed lines before this report.

## Findings

[P2] (confidence: 9/10) backend/functions/ReviewSystem/business/model/reviewAlertRules.js:119: a deleted draft's successful publication loses its guest candidate.

Evidence:
- reviewAlertRules.js:119: `previousResponse.status !== "draft" || previousResponse.deletedAt != null`
- reviewAlertRules.js:120: `previousResponse.publishedAt != null))) return [];`
- data/hostReviewRepository.js:43: `const existing = await repository.findOne({ where: { reviewId } });`
- data/hostReviewRepository.js:49-50: `action === "publish"` sets `status = "published"`.
- data/hostReviewRepository.js:52 retains `id: existing?.id || randomUUID()`.
- data/hostReviewRepository.js:54: `publishedAt: status === "published" ? existing?.publishedAt ?? now : null, deletedAt: null`
- data/hostReviewRepository.js:74: deletion sets `{ status: "deleted", deletedAt, updatedAt: deletedAt }` without requiring a published response.

A host can save a draft, delete it, then publish a response using that same row.
The current response is successfully published and non-deleted, with its first
publishedAt. Passing the real deleted-before snapshot returns no candidate.
A direct Node reproduction returned one candidate for an active draft predecessor
and zero for a deleted draft predecessor with otherwise identical current data.
The published response qualifies under the story; its predecessor's deletion
must not suppress its first publication notification.

Recommendation: accept a matching never-published deleted predecessor for first
publication. Continue rejecting deleted current responses and previously published
predecessors; retain response ID/publication-time keys. Add regression coverage
for save draft -> delete -> publish and replay deduplication.
Decision: user approved option A: support first publication of a matching deleted, never-published response and add regression/replay coverage while preserving duplicate protection. Implementation pending.

## What already exists

- Shared candidate shape and deterministic key construction are reused.
- Review ownership uses reviewer_user_id, the canonical review author's ID.
- Review_Alert and its recipient/event unique constraint need no migration.
- Existing host/admin rules and delivery branches are unchanged.
- Approval/publication follow separate persisted states; timestamps are explicit
  immutable event inputs, and response publication uses publishedAt.

## Failure modes

| Path / failure | Test coverage | Handling and visible result |
|---|---|---|
| Approval/rejection/publication: wrong predecessor, owner or state | Covered | Empty candidates; no delivery in this scope |
| Approval: approved but still unpublished | Covered | No publication candidate |
| Host response: draft, deleted current row, unrelated review or failed publish snapshot | Covered | Empty candidates |
| Deleted draft -> first successful publication | Missing | Silently missing candidate; finding above |
| Invalid ID or event timestamp | Covered | Empty candidates |
| Replayed review/response event or content edit | Covered | Stable event identity; database uniqueness is enforced by existing repository |
| Repository insert conflict | Mocked result covered; existing repository suite also ran | Existing atomic conflict behavior preserved |
| Concurrent changes after evaluation | Integration deferred | Candidates are snapshots; future delivery must revalidate |

Pure evaluation introduces no I/O timeout or persistence failure path. Notification
transport and database failures belong to the future guest delivery integration.

## Diagrams

    committed before/after review or response snapshots
                          |
                          v
    guest(type, ...) -> validate state/ownership -> normalized author candidate
                          |
                          v
    future persistence/delivery consumer (outside this diff)

    PENDING_APPROVAL -> APPROVED -> PUBLISHED
    PENDING_APPROVAL / APPROVED -> REJECTED (candidate contract)
    draft -> deleted -> published (existing response writer; finding above)

## Not in scope and decisions

- Delivery hooks, email, endpoints and frontend: explicitly outside candidate-only
  acceptance. Do not claim guest notifications are automatically delivered yet.
- Rejection writer: the existing backend recognizes REJECTED records but has no
  rejection write workflow; this rule supports explicit committed snapshots only.
- New tables/migrations: existing alert storage already supports these types.
- Earlier administrator findings and stacked changes: not introduced by this
  feature; this report does not certify the entire acceptance comparison.

Architecture decision: keep explicit pure guest rules beside existing host/admin
rules and extend only repository type validation. Expanding the host evaluator or
wiring delivery here would change established behavior and scope. Consequence:
future orchestration must supply trusted committed snapshots, immutable event
timestamps, and authorization revalidation. Runtime/memory cost per evaluation
is constant; this feature adds no database queries or unbounded collections.
