# Review alert rules: engineering review

Date: 2026-11-13. Branch: `feat/review-alert-rules`.
Scope: new `reviewAlertRules.js` and `reviewAlertRules.test.js` in the working tree.
Workflow: [.claude/skills/eng-review/SKILL.md](../../../.claude/skills/eng-review/SKILL.md).

## Findings and decisions

Architecture, code quality, tests and performance passes completed. No blocking findings.
An independent reviewer inspected the rules, tests and existing contracts; no disagreements.
No existing review behavior, models or persistence paths change.

- Publication uses the shared predicate: `reviewRules.js:7` requires both statuses to be `PUBLISHED`.
- The publication clock is explicit: `reviewAlertRules.js:33` states "publishedAt must be the original publication event time in epoch milliseconds."
  `Review.js:28` defines mutable `updated_at`; `reviewRepository.js:564` updates it when flagging.
  Decision: require the original event timestamp rather than infer publication from creation or update time.
  Consequence: missing publication time produces no candidate; callers must retain that event context.
- Decline detection reuses `hostReviewRepository.js:186`: "WHEN current_average_rating - previous_average_rating <= :declineBoundary THEN 'DECLINING'".
  Decision: consume that classification with matching window bounds, preserving existing policy and minimum samples.
- `reviewAlertRules.js:56` checks host role and published status; line 57 checks deletion and publication time.
  Drafts, deleted responses and future publication times do not suppress overdue candidates.
- Event keys encode type, recipient, property, optional review and event identity (`reviewAlertRules.js:29`).
  Replays preserve identity; different publication events and trend windows have distinct keys.
- Performance: O(number of supplied responses), short-circuiting on a published response; other rules are O(1).
  No database calls, writes, asynchronous operations or unbounded caches.

## What already exists

Reuse `isPublished`, numeric overall ratings transformed by the Review model, host response lifecycle fields,
and the existing property trend query. Category scores do not replace overall scores.
Eligibility preserves the existing 1-5 half-star rating domain.

## Failure modes

| Path / failure | Coverage and handling | Visible result |
|---|---|---|
| New review is approved but unpublished, deleted, or has missing IDs | Eligibility tests; no candidate | No delivery in this module |
| Overall rating is missing, invalid, or above 2 | Rating domain and boundary tests; no low-rating candidate | No delivery |
| Decline result is stable, insufficient, missing, or has invalid windows | Classification and missing-context tests; no candidate | No delivery |
| Missing publication time or invalid clock | Missing-clock and mutable-timestamp tests; no candidate | No delivery; future caller must monitor missing context |
| Invalid overdue configuration | Parameterized tests; 72-hour fallback | Normal default deadline |
| Response is draft, deleted, unrelated or not yet published | Response tests; does not count as answered | Candidate at or after deadline |
| Published host response exists | Response tests; suppresses overdue candidate, even if answered late | No overdue candidate |
| Repeated evaluation | Replay tests; stable keys and event times | Future persistence layer must deduplicate |
| Caller supplies incomplete responses or mismatched trend context | Integration responsibility; no lookup here | Can misclassify; callers must supply complete, trusted inputs |

## Data flow

```text
Publication event + review snapshot + responses + explicit clock
  ▶ publication eligibility ▶ review rules ▶ normalized candidates
Existing performance query + matching window bounds + recipient
  ▶ DECLINING classification ▶ property rule ▶ normalized candidate
```

## Not in scope

- Publication event storage and response loading: this PR provides pure rules only.
- Scheduler, delivery, persistence and deduplication: explicitly excluded; candidates alone do not send alerts.
- Authorization of trend inputs and recipients: future callers must use trusted repository results.
- Frontend, endpoints, migrations and TypeORM model changes: explicitly excluded.

## Validation

Executed Jest for `reviewAlertRules`, `propertyRatingTrends` and `propertyRatingTrendsRepository`:
3 suites passed, 111 tests passed, including 73 focused rule cases.
Existing trend tests cover configured thresholds and minimum samples; the rule tests cover consuming their classifications.
No live database or delivery integration was tested or changed.

## PR checklist

- [x] Engineering review feedback was checked, and findings were fixed or recorded.
- Review workflow: [eng-review](../../../.claude/skills/eng-review/SKILL.md).
- [x] Findings and decisions are recorded in [2026-11-13-review-alert-rules.md](2026-11-13-review-alert-rules.md).
