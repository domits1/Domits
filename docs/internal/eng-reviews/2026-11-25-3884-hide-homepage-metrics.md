# fix(home): hide the unverified metrics on the homepage host section #3884

Pull request: #3979
Issue: #3884
Reviewed commit: a4944b57d
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (4/10) | frontend/web/src/styles/sass/pages/home/homePage.scss:700 | The `.host-stats` styles (also at lines 774 and 838) are unused now that the block no longer renders. | Accepted, because the block is meant to come back once the numbers are verified. |
| P4 (3/10) | frontend/web/src/pages/home/homePage.test.jsx | The test only runs in English. | Accepted, because nl, de and es render through the same JSX, so one language covers the code path. |

The test was also checked by putting the removed block back: it fails, so it would catch the numbers returning.

## Not in scope

- Deleting the stats data in `buildHostSection` and in `hostSection.stats` of en, nl, de and es. It stays so the numbers can return when they are verified.
- Deleting the `.host-stats` styles, for the same reason.
