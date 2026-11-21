# Admin review flagging: engineering review

## Deployment follow-up (2026-11-18)

The migration must precede the ReviewSystem deployment because approval and
publication now query `review_flag`. Added SQL matching all six `up()` statements
and the [deployment gate/runbook](../tools/dsql_review_flag_runbook.md), including
verification of both schemas and asynchronous index readiness. The AWS identity
check returned `NoCredentials`; the migration was not applied and live state
remains unverified. This deployment gate is still open, not fixed by documentation.
The three newly introduced code comments called out in review were removed.

Branch: `feat/admin-review-flagging`.
Base: `origin/acceptance` (`677c6b365`).
Reviewed commit: `61a782d06`.
Pull request / issue: not supplied; link before opening the PR.
Result: one open P2 finding; review completed, readiness checklist remains unchecked until fixed or explicitly accepted.

Reviewed the complete branch diff, including inherited dashboard, Login, guard,
test and infrastructure changes. Applied `.claude/skills/eng-review/SKILL.md`.
An independent reviewer inspected the backend flagging implementation and agreed
with the pagination finding. No disagreements were reported. No implementation
changes were made as part of this review.

## Findings and decisions

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `backend/functions/ReviewSystem/business/service/reviewService.js:344` | Resolving earlier pending flags shrinks the filtered result set, so following `next_offset` can silently skip unresolved flags. | Open. Recommend cursor pagination on `(created_at, id)` and a regression covering resolution between page requests. Awaiting user decision; not accepted or fixed. |

Verification evidence:

- `reviewService.js:344`: `return { flags: rows.slice(0, limit), next_offset: rows.length > limit ? offset + limit : null };`
- `reviewRepository.js:520`: `.addSelect("review.overall_rating", "overall_rating").where("flag.status = :status", { status })`
- `reviewRepository.js:521`: `.orderBy("flag.created_at", "ASC").addOrderBy("flag.id", "ASC").limit(limit).offset(offset).getRawMany();`
- `reviewRepository.js:532`: `const updates = { status: "RESOLVED", resolved_by: userId, updated_at: nextTimestamp(now, flag.updated_at) };`
- `reviewRepository.js:533`: `const result = await flags.update({ id, status: "PENDING" }, updates);`

Example: start with 40 pending flags, load 20, resolve those 20, then request
`next_offset: 20`. The remaining 20 now occupy offsets 0–19 and are skipped.
Concurrent moderators can trigger the same omission. The existing test checks
static offset SQL, not this mutation scenario. The response is successful and
may incorrectly indicate the end of the queue, so there is no visible error.

Options considered: a stable keyset cursor (recommended), or an explicitly
documented restart-at-zero contract after every resolution. The latter does
not protect continuation from another moderator resolving earlier rows.

## Four review passes

- Architecture: controllers reuse authenticated execution; moderation actions
  require both the username allowlist and active approver membership. Flag
  creation and the review version write share a retried transaction. Approval
  and publication both check pending flags. The new table is a deployment
  dependency for existing approval/publication flows.
- Code quality: bounded reasons/notes, explicit errors, idempotent resolution,
  preserved audit records, and no private-feedback projection in queue rows.
  Existing Admin/approver separation and ordinary-host unknown-access behavior
  match the decisions already made in this chat.
- Tests: authorization, basic validation, queue projection, resolution,
  duplicate flags, transactional rollback, approval/publication holds and audit
  retention are covered. The pagination mutation regression is missing.
- Performance: moderation requests cap page size and fetch one extra row for
  continuation. Ordering matches the queue index. Offset traversal grows with
  queue depth and has the correctness defect above. The inherited full-queue
  access probe remains a known cost; no new performance benchmark was run.

## What already exists

Reuse ReviewSystem's authorization, transactions with serialization retries,
review version checks, HTTP error handling, and existing `/reviews` methods.
The dashboard reuses queue hooks, API helpers and presentation components.
The PropertyHandler admin allowlist is separate from ReviewSystem permissions;
one must not substitute for the other.

## Failure modes

| Path / failure | Handling and user-visible result | Test evidence |
|---|---|---|
| Unauthorized flag, list or resolve | Allowlist and active-role checks reject with 403. | `reviewFlagging.test.js`, `reviewApproverRole.test.js` |
| Invalid reason / malformed payload | Validation produces 400; notes have length/control-character checks. | Basic invalid-reason/controller coverage exists; not every notes boundary has a dedicated case. |
| Missing/deleted review or duplicate pending flag | 404/409; transaction rolls back review version writes. | `reviewEntities.test.js` |
| Approval or publication while a flag is pending | 409 instructs caller to resolve the flag. | `reviewEntities.test.js` covers both transitions. |
| Resolving an already resolved flag | Returns the stored resolution without rewriting the audit actor. | `reviewEntities.test.js` |
| Queue changes between pages | Successful response silently omits remaining flags. | Missing mutation regression; open finding above. |
| Migration not applied before Lambda rollout | Approval/publication query the new table and can fail. | No live deployment check performed; migration execution and index readiness must be confirmed operationally. |
| Review access request fails | Ordinary hosts retain access; Admin users get a retry state. | Existing guard/Login regression suites; a request that never settles still has no explicit client timeout. |

## Data flow and state

```text
Authenticated staff
    ▼
/reviews?scope=moderation (POST / GET / PATCH)
    ▼
Controller ▶ username allowlist + active approver role
    ▼
Service ▶ validate inputs / page request
    ▼
Repository ▶ transaction / Review_Flag + review version

Flag: PENDING ▶ RESOLVED (audit retained)
Review: DRAFT ▶ PENDING_APPROVAL ▶ APPROVED ▶ PUBLISHED
                    ▲                ▲
                    └─ pending flag blocks these transitions ─┘
```

## Not in scope and accepted context

- Endpoint IaC restoration: user confirmed the endpoint was deployed manually
  and explicitly excluded restoring those files. This review does not reopen
  that decision or independently certify the deployed configuration.
- Database deployment: no live database mutation or inspection was authorized
  or performed. Apply the migration and verify asynchronous indexes are ready
  before deploying code that reads `review_flag`; deployed state is unverified.
- A moderation UI, browser screenshots and responsive QA were not produced.
  This backend branch exposes the moderation contract; the inherited approval
  page does not add flag-management controls.
- Lightweight access probing / caching and a client timeout remain follow-up
  work. The known full-queue probe cost is not represented as resolved.
- No acceptance of the pagination defect is implied by writing this record.

## Validation

Executed on this reviewed tree:

`npm test -- --runInBand --silent test/ReviewSystem` from `backend`.

Result: 17 suites, 387 tests passed. These tests use mocks/in-memory transaction
models; they do not establish live DSQL migration or concurrency behavior.
Frontend suites were not rerun for this documentation-only review. Earlier
full-suite and corrected-suite runs are historical evidence, not a fresh run.

## PR checklist status

- Review executed: yes. All findings fixed or explained/accepted: pending the
  decision on the open P2; leave the first checkbox unchecked for now.
- Findings and decisions recorded: yes, in this file. Replace `File pending`
  in the PR with a link to this file; no PR description was edited here.
