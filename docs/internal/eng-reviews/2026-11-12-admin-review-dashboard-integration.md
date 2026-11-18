# Admin review dashboard integration: engineering review
Branch: `feat/admin-review-dashboard-integration`; base: `feat/admin-review-dashboard-styles`; reviewed: `2aa9626fd`; date: 2026-11-12; PR/issue not supplied.
Result: no blocking findings; architecture, code quality, tests and performance passes complete; independent reviewer agrees with no disagreements.
## Findings and decisions
Approvers go to admin pages. Unknown approval access preserves existing host access; users without host access remain denied. Backend authorization remains authoritative.
## What already exists
Reuse queue/API helpers, presentation components, backend authorization and CSS Module. PropertyHandler navigation access and ReviewSystem permissions remain separate allowlists.
## Failure modes
Denied queue access shows Not authorized; failed loads show an error/retry; empty/filter results have explicit messages. Final-stack page tests cover these paths.
Stale versions and failed moderation show parent-hook notices; duplicate requests are guarded. Existing API/final-stack tests cover conflict/error paths; selection follows visible rows.
Login/access outages return unknown; the guard preserves ordinary host access. Guard and Login role-policy tests are included in this branch, including approval redirects and unknown-access handling.
## Data flow
Login/MFA ▶ access probe ▶ host guard ▶ admin page ▶ queue hook ▶ authorized backend; tabs/search/rating/pagination select among at most 100 loaded rows.
## Performance and scope
The first access probe still uses the pending queue; a lightweight access endpoint remains deferred. Concurrent probes share a request, and only confirmed approval access is cached in memory for five minutes per authentication token. Denied and unknown answers are not cached, allowing newly granted permissions to be recognized on the next check. Authentication-change events clear the cache. Each caller has a five-second deadline covering token retrieval, network and response parsing. A later caller sharing a request that times out retries within its own remaining deadline rather than inheriting the first caller's abort. The guard uses a stable account identifier to avoid rechecking when the user object is refreshed. Search/pagination are local, not global. Browser/screenshots/viewport evidence remain separate work.
## Validation
Navigation and ordinary MFA suites passed locally; route suite is also being verified. Full CSS parsed: 103 class-scoped rules; whitespace checks passed. No browser or responsive-readiness claim.
