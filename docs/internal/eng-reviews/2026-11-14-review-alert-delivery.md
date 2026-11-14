# Review alert notification delivery: engineering review

Pull request: not opened. Issue: not supplied.
Date: 2026-11-14. Reviewed commit: `711051c7b`, plus the approved preference fix in the working tree.
Workflow: [eng-review](../../../.claude/skills/eng-review/SKILL.md).
Scope: the three notification-delivery files introduced by that commit.
Result: one blocking deployment finding and two requirement gaps await decisions; boolean email opt-out fixed.

## Findings and decisions

Architecture, code quality, tests, and performance passes completed in that order.
An independent reviewer confirmed all four findings; no disagreement on the defects.

| Severity | Where (paths relative to backend/) | Finding | Decision |
|---|---|---|---|
| P1 (10/10) | functions/ReviewSystem/business/service/reviewAlertNotificationService.js:6 | Imports a sibling Lambda directory absent from deployed packages. Import fails when the service is integrated. | Pending approval: use a local adapter over the existing ORM preference model. No deployment or publication hook was added. |
| P2 (10/10) | functions/ReviewSystem/business/service/reviewAlertNotificationService.js:55 | Stored boolean false bypasses the email opt-out. | User approved a fix: recognize legacy false alongside per-channel email false; add three regression cases. |
| P2 (9/10) | functions/ReviewSystem/business/service/reviewAlertNotificationService.js:45 | UNREAD alert is inserted before preferences are read; supported inApp false is ignored. | Pending decision: separate email claims from visible alerts, or explicitly accept always persisting alerts in this scope. Do not silently repurpose READ/DISMISSED as delivery state. |
| P2 (9/10) | functions/ReviewSystem/business/service/reviewAlertNotificationService.js:37 | Direct rule candidates contain no rating fields, so relevant rating information is omitted. | Pending decision: enrich through trusted repository data or require a documented validated enrichment contract. |

## Verification evidence

Line references below describe reviewed commit `711051c7b`, before the preference fix.

- Deployment: service line 6 imports `../../../communication-preferences/data/hostNotificationPreferencesRepository.js`.
  `backend/CD/npm/packageForUpload.js:136`: `await fs.cp(functionDir, deployTempDir, { recursive: true });`.
  Lines 138-142 additionally copy only `.shared`, not sibling functions.
- Boolean preference: service line 55: `if (keys.some(key => settings[key]?.email === false)) {`.
  Existing `functions/communication-preferences/business/service/service.js:75`:
  `if (typeof storedChannels === "boolean") {`; line 78: `: { inApp: false, email: false, sms: false };`.
- In-app preference: service line 45 starts `const created = await this.repository.createAlertIfMissing(`;
  line 51 reads preferences afterward: `const record = await this.preferences.findByUserId(recipient);`.
  Only email is checked at line 55. Existing preference normalization supports inApp at line 78 above.
- Rating contract: `functions/ReviewSystem/business/model/reviewAlertRules.js:28-30` returns
  `type, recipientUserId, propertyId`, optional reviewId, eventKey, and eventTimestamp, without ratings.
  Delivery lines 37-38 filter `overallRating`, `previousRating`, and `currentRating` from the event.
  `functions/ReviewSystem/data/reviewAlertRecipientRepository.js:15` selects `["id", "overall_rating"]`,
  but line 22 returns only recipient IDs. Tests manually enrich input at lines 9-10 and 28.

## What already exists

Reuse ReviewAlertRepository's atomic unique-key insert and UNREAD default, ReviewAlertRules event identities,
ReviewRequestNotifier's synchronous Lambda contract and maxAttempts: 1, property ownership and active manager
relationships, and the existing preference schema. The sibling import needs correction for actual packaging.
Content allowlisting and the fixed HTTPS dashboard URL exclude private feedback and unpublished review text.

## Failure modes

| Path / production failure | Test coverage and handling | Visible result |
|---|---|---|
| Malformed event | Parameterized validation tests; caught and logged | No alert; empty result |
| Property/review/recipient missing | Empty recipient and unpublished lookup tests; no send | Empty result; no dashboard alert |
| Recipient lookup throws | Outer catch exists; dedicated failure test absent | Generic log; empty result |
| Concurrent duplicate event | Concurrency and repository conflict tests; only insert winner sends | DUPLICATE; existing state preserved |
| Persistence fails | Covered; catch logs, no email | FAILED; no alert |
| Preference disabled | Object and new boolean opt-out cases covered; email skipped | EMAIL_DISABLED; persisted alert remains |
| Preference lookup/JSON fails | Catch exists; dedicated tests absent | FAILED; alert remains; no retry |
| User email missing | Covered; no email invocation | EMAIL_UNAVAILABLE; alert remains |
| Email send times out or acknowledgement is ambiguous | Covered through injected delivery failure; catch logs | FAILED; alert remains; duplicate replay never resends |
| Packaged module import fails | Packaging contract verified; packaged import test absent | Service unavailable on integration; blocker above |
| Real candidate has no ratings / in-app disabled | Missing integration coverage; findings above | Missing rating content / unwanted UNREAD alert |

## Delivery decision and performance

Context: the model has no dedicated email-delivery state. Options: reuse atomic insertion as a one-shot
claim, or introduce a separate delivery ledger/outbox. Current choice: atomic insertion; no automatic retries.
Consequence: a crash after insertion can lose an email, including before the first send. Manual reconciliation
is necessary; do not delete alerts to retry uncertain sends. In-app preference conflict remains unresolved.
Resolution uses constant property/review/team queries, followed by sequential preference and user/email calls
per recipient. Runtime grows with team size. Batching, concurrency limits, and pagination are deferred until
real team-size measurements justify them. No unbounded cache or review-content loading is introduced.

```text
Trusted event ▶ validate ▶ property/published review + active managers
  ▶ atomic UNREAD insert ▶ duplicate: stop
  ▶ email preference ▶ authenticated email lookup ▶ single email attempt
  ▶ failure: safe log + result; publication state untouched
```

## Not in scope

- Publication hooks, endpoints, frontend: explicitly excluded by the story.
- Automatic retries, delivery ledger/outbox: changes persistence and requires a separate decision.
- Shared notification refactoring: avoid broad changes to repair a single service's packaging.
- Live AWS/database delivery verification: tests use mocks; provider delivery cannot be proven locally.

## Validation and checklist

Baseline: 23 ReviewSystem suites / 594 tests passed before review; 18 focused delivery cases.
Post-review preference regression run: 1 focused suite / 21 tests passed, including all three boolean opt-outs.
The review record and fixes must remain within the story's strictly fewer than 400 changed lines.

- [ ] Engineering review findings resolved or explicitly accepted; remaining decisions above are pending.
- [x] Findings and decisions recorded in this file.
