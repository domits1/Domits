# Administrator review alert candidate rules

Pull request: not provided
Issue: not provided
Reviewed commit: ab95cbb85
Base: f590dc6d4 (stacked feature parent)
Result: two P2 findings; both fixes approved, implementation pending. No implementation changes made by this review.

## Scope and verification

Reviewed the seven-file administrator-alert diff, then traced moderation transitions,
flag creation, authorization, alert persistence and host delivery. The acceptance
comparison includes 127 files (7,929 additions / 525 deletions) of stacked work;
this report does not certify that entire stack. Target the feature parent or
rebase the stack before claiming a PR below 500 changed lines.

Four passes completed: architecture, code quality, tests, performance.
Independent reviewer agreed with both findings and the candidate-only scope;
no substantive disagreements.

Validation: four targeted Jest suites, 116 tests passed. Existing tests do not
establish timestamp immutability or query-level recipient filtering.

## Findings

### [P2] (confidence: 10/10) backend/functions/ReviewSystem/business/model/reviewAlertRules.js:84: approval event timestamp changes after flagging

Evidence:
- reviewAlertRules.js:84: `let eventTimestamp = review.updated_at;`
- data/reviewRepository.js:609: `const result = await reviews.update({ id: review.id, updated_at: review.updated_at },`
- data/reviewRepository.js:610: `{ updated_at: nextTimestamp(flag.created_at, review.updated_at) });`
- test/ReviewSystem/reviewAdminAlerts.test.js:18 changes updated_at to 999 and checks only eventKey equality.

A review submitted at T1 and flagged at T2 still has PENDING_APPROVAL status.
Reevaluating its approval candidate reports T2 with the same event key. APPROVED
reviews have the same problem. The timestamp no longer identifies the event
that the candidate describes, even though duplicate identity remains stable.

Recommendation: use a trusted immutable transition timestamp (for example, a
backend transition event snapshot), validate it against the review/event identity,
and test a flag update followed by replay. Do not substitute evaluation time.
Decision: user approved option A: use a trusted immutable transition timestamp and add replay coverage. Implementation pending; no fix applied during this review.

### [P2] (confidence: 9/10) backend/functions/ReviewSystem/data/reviewAdminAlertRepository.js:19: every event loads the entire active team population

Evidence:
- line 19: `const members = await database.getRepository(Team_Member).find({ where: { status: "active" },`
- line 22: `&& REVIEW_APPROVER_ROLES.includes(member.role) && isReviewAdministrator(member.member_user_id))`

Role and allowlist filtering occur after materializing all active members across
all hosts. Repeated review events multiply database transfer and application
memory by the full active team population, even with an empty administrator
allowlist or a missing review. Recipient counts should be bounded by the allowlist.

Recommendation: filter active status, authorized roles and allowlisted usernames
in SQL; short-circuit an empty allowlist and missing review. Preserve the existing
global administrator scope. Add a test asserting query filtering.
Decision: user approved option A: constrain active status, authorized roles and allowlisted usernames in SQL; return early for an empty allowlist or missing review; add query-boundary tests. Implementation pending.

## What already exists

- ReviewService.assertReviewApprover requires allowlist membership AND an active
  authorized role. Shared constants and allowlist checks preserve that policy.
- ReviewRepository enforces DRAFT -> PENDING_APPROVAL -> APPROVED -> PUBLISHED.
- Pending flags are stored in review_flag; their IDs provide distinct identities.
- Review_Alert already has unique (recipient_user_id, event_key) arbitration.
- Host delivery remains unchanged. Admin candidates are not wired to it, and it
  currently rejects administrator types. This PR identifies candidates only.
- The selected fields and explicit candidate construction exclude guest feedback.

## Failure modes

| Path | Failure | Test coverage | Handling / visible result |
|---|---|---|---|
| Input boundary | Unsupported type or missing flag ID | Covered | Empty candidates; no read |
| Review lookup | Missing/mismatched review | Mismatch covered; missing not explicit | Empty candidates; no UI symptom |
| Flag lookup | Missing/resolved/unrelated flag | Rule cases covered; lookup null not explicit | Empty candidates |
| Recipient resolution | Empty allowlist, inactive/wrong-role users | Covered | Empty candidates / excluded users |
| Database reads | Timeout/rejection | Not covered | Rejection propagates; future caller owns logging/retry |
| Event timestamp | Flag updates approval timestamp | Not covered as failure | Silently incorrect timestamp; finding above |
| Recipient query | Large active population | Not covered | Unbounded transfer/memory; finding above |
| Candidate replay | Duplicate state or flag event | Key tests covered | Same event key; no write occurs here |
| Persistence | Duplicate alert insertion | Mocked result covered; existing repository tests apply | Existing atomic conflict handling |
| Concurrent moderation | State/authorization changes after reads | Not covered | Snapshot can become stale; delivery must revalidate |

No unhandled production delivery path is introduced because this change is a
read-only candidate boundary. Database failures are visible to its caller as
rejections; production orchestration is deferred.

## Diagrams

Component/data flow:

    trusted event references (type, review ID, optional flag ID)
                          |
                          v
    CandidateService -> AdminAlertRepository -> review / review_flag / team_member
                          |
                          v
    pure administrator rules -> normalized candidates
                          |
                          v
    future orchestration / persistence / delivery (outside this diff)

State machine:

    DRAFT -> PENDING_APPROVAL -> APPROVED -> PUBLISHED
                  |                 |            |
                  +-----------------+------------+
                                    |
                                    v
                        pending moderation flag

## Not in scope

- Delivery hooks, email content and new endpoints: acceptance is candidate
  identification; rule evaluation must remain independent of writes/email.
- Frontend changes and new tables: explicitly excluded by the story.
- Restricting admins to a property's host team: existing approver authorization
  and queues are global; adding a host filter would change policy.
- Historical stack review: this report covers the administrator-alert commit.
- Atomic delivery authorization: a future consumer must revalidate before sending,
  as the host processing service already does; candidates are snapshots.

Decision context: a separate read-only boundary preserves host behavior and keeps
moderation rules testable. Alternatives were expanding the host delivery service
or introducing new storage. The candidate boundary was retained for this scope;
actual administrator delivery remains future work and is not claimed complete.


