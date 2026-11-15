# Secure Review Alerts API: engineering review

Pull request: number not supplied. Issue: number not supplied.
Reviewed commit: `4884a579d`; API diff baseline: `980a76a74`.
Date: 2026-11-15. Workflow: [eng-review](../../../.claude/skills/eng-review/SKILL.md).
Result: two blocking findings, pending decisions. Review passes complete; merge gate remains open.

## Findings and decisions

Architecture, code quality, tests, and performance were reviewed in that order.
An independent reviewer inspected the same diff and confirmed both findings. No disagreements.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | backend/functions/ReviewSystem/index.js:9 | Alert routes have Lambda dispatch entries but no tracked API Gateway configuration or external deployment evidence. Synthetic handler tests cannot verify public route availability, Cognito method setup, invocation permissions, or gateway preflight. | Pending user decision: restore alert infrastructure and tests (recommended), or document and verify externally managed gateway configuration. No live AWS availability claim is made. |
| P2 (10/10) | Deleted backend/infrastructure/review-response/template.json:52 at baseline | This API diff deletes existing response/scheduler infrastructure and response regression tests, unrelated to alert management. The complete diff is 191 additions + 434 deletions = 625 changed lines, above the strict 400-line limit. | Pending user decision: remove unrelated deletions from this PR; keep any intentional cleanup separate. Do not restore user-deleted files without agreement. |

## Verification evidence

Line numbers refer to reviewed HEAD unless explicitly labeled baseline.

- `backend/functions/ReviewSystem/index.js:9`:
  `["/reviews/alerts", new Map([["GET", "manageReviewAlerts"]])],`
  Lines 10-11 register the two PATCH actions; line 46: `const resourceRoutes = routes.get(event?.resource);`.
  The router requires matching API Gateway resource templates; it does not provision them.
- `backend/test/ReviewSystem/reviewAlertsApi.test.js:9-10` supplies
  `resource: "/reviews/alerts"` and `claims: { sub: "host", "cognito:username": "different-name" }`.
  Lines 87-99 invoke the handler with synthetic events, not deployed gateway requests.
  Repository inventory contains no `backend/infrastructure/review-alerts` definition or alert gateway test.
- Deleted `backend/infrastructure/review-requests/template.yaml:9-13` at baseline defines
  `Schedule:`, `Type: AWS::Events::Rule`, `Name: domits-review-requests`, and `ScheduleExpression: rate(15 minutes)`.
- Deleted `backend/infrastructure/review-response/template.json:52` at baseline defines
  `"ApproveResource": {"Type": "AWS::ApiGateway::Resource"` (line continues with properties).
  Lines 53-55 define the authenticated method, invocation permission, and preflight. All 332 lines are deleted.
- Deleted `backend/test/infrastructure/reviewResponseRoutes.test.js:4-5` at baseline loads
  `"../../infrastructure/review-response/template.json"`; all 40 regression-test lines are deleted.
  `git diff 980a76a74 4884a579d --numstat` verifies the 625-line total, before this review record.

## What already exists

- AuthManager reads the verified Cognito authorizer subject; client headers are not decoded as authentication.
- Controller.executeAuthenticated and existing exception handling provide consistent 401/400/404/500 responses.
- ReviewAlertRepository supplies recipient-scoped newest-first pagination and conditional status transitions.
  The API adds recipient-scoped unread count and single-alert lookup, without a model change.
- DTO allowlisting returns only required alert fields plus a fixed relative dashboard destination.
  Recipient IDs, event keys, and private feedback are excluded.
- Lambda-local dependencies preserve package boundaries. No event generation or publication hook is added.

## Failure modes

| New path / failure | Test and handling | User-visible outcome |
|---|---|---|
| Missing verified subject or forged Authorization header | Authentication tests; existing 401 handler | 401, no repository access |
| Invalid pagination, status, ID, body fields, or repeated query | Parameterized controller tests; validation before repository calls | 400 |
| Empty recipient page or status filter | Default/empty-page tests and repository storage ordering tests | 200 with alerts and total unread count |
| Foreign or missing alert ID | Scoped repository options and controller 404 tests; existing storage tests check foreign mutations | Same 404 for both; no foreign alert returned or changed |
| Repeated read/dismiss or read after dismissal | API repeat tests plus existing conditional-update storage tests | 200 with current row; no timestamp churn or reopening |
| List/count/update/lookup database failure | All five dependency methods have injected-failure tests; existing safe error response | Logged failure and generic 500 |
| Update commits but response lookup fails | Lookup-failure test; subsequent request is idempotent | 500; retry returns current state |
| Concurrent list/count or status update | Separate scoped queries; no snapshot guarantee | Page/count can differ slightly; PATCH returns the latest observed row |
| Gateway routes or authorization missing | No deployed-route verification or gateway configuration test at HEAD | Possible routing/authentication failure before Lambda; blocking finding above |

The gateway path has a critical verification gap: synthetic Lambda tests cannot close it.

## Decisions and performance

Context: clients need recipient isolation, not a new property-ownership lookup for historical alerts.
Options: authorize by the immutable alert recipient, or re-resolve current property ownership for every read.
Choice: reuse the token subject and recipient-scoped repository filters. Consequence: only assigned recipients
can access alerts; a historical recipient retains their own record even after property ownership changes.

Lists use two bounded-result queries in parallel; updates use a conditional write followed by a scoped read.
Limit is capped at 100. The existing recipient/created/id index supports stable ordering. Large offsets and
unread counts can become costly with long histories; no measured problem justifies schema changes here.
Separate page/count snapshots are acceptable metadata semantics, not a transactional consistency promise.

```text
API Gateway route + Cognito (configuration/verification pending)
  ▶ Lambda resource router ▶ authenticated token sub ▶ alert service validation
  ▶ recipient-scoped repository ▶ allowlisted DTO + no-store response
UNREAD ▶ READ ▶ DISMISSED; UNREAD ▶ DISMISSED; repeated actions preserve state
```

## Not in scope

- Alert generation/publication hooks: explicitly reserved for PR 5.
- Frontend and schema changes: unnecessary for these recipient-scoped endpoints.
- New roles/ownership models: use the existing authenticated recipient boundary.
- Cursor pagination, additional indexes, or transactional page/count: defer until measurements require them.
- Removing scheduler/response infrastructure: unrelated cleanup must not expand this PR.
- Live AWS deployment: not performed by this review; external state is unverified.

## Validation and PR checklist

Focused API, repository, router, and Lambda-boundary test run: 4 suites passed, 103 tests passed.
The earlier 671-test result predates the infrastructure deletions and is not evidence for the current diff.

- [ ] Engineering review findings fixed or explicitly accepted; two decisions remain pending.
- [x] Findings and decisions recorded in this file.
