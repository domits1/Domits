# feat(channexadmin): Channex health section on the admin page

Pull request: (to fill in)
Issue: #2869 (first slice: internal admin health view; design note `docs/partner/integrations/channel_manager/channex/channex_health_dashboard_design.md`; backend in PR #3850)
Reviewed commit: staged diff per commit on `feat/2869-channex-health-section`
Result: no blocking findings so far

## Findings

### Commit 1: `getChannexHealth` in `channexApi.js`

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | `channexApi.js`, `getChannexHealth` | Reuses `requestChannex`, so the ID token, the network-error wrap and the status on a failed response are the same code `connectChannex` already tests; the new test covers only what is new: the path and no `userId` in the query. | No change. |
| Checked | `channelAuthenticatedUser.js`, `resolveAuthenticatedUserId` | The backend reads the user from `claims.sub` and overwrites any `userId` in the query, so leaving it out loses nothing and cannot be spoofed. | No change. |
| P3 (5/10) | `channexApi.js`, other admin calls | `getChannexAdminAccess` and others still send `userId`, which the backend overwrites; the new call is the only one without it. | Accepted: removing it from the others is outside this slice and would touch every Channex call. |
| Checked | API Gateway `/integrations/channex/{proxy+}` | The route reaches the backend through the existing proxy resource, which already has CORS for the other Channex GET calls. | No change. |

### Commit 2: `describeReason` in `channexadmin/health/channexHealthFormat.js`

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | `channexHealthFormat.js`, `REASON_SENTENCES` | All 8 codes of the backend's `HEALTH_REASON` have a sentence, each with a test row; singular and plural are tested for both counts. | No change. |
| P3 (6/10) | `channexHealthFormat.js`, `REASON_SENTENCES` | The codes are written again as strings: the backend and web are separate npm workspaces, so the constant cannot be imported. A code added in the backend only would drift. | Accepted: an unknown code is shown as itself (tested), so drift shows a raw code instead of hiding the reason. |
| P3 (4/10) | `describeReason` | A reason without `alarm` would read "Critical alarm: undefined". The backend always sets `alarm` for the three alarm codes (`channexHealthStatus.js`, `alarmReasons`). | Accepted, no guard for a case the contract excludes. |
| Checked | `STUCK_QUEUE` | `Math.floor` could print "0 min", but the backend only sends `STUCK_QUEUE` after 7 minutes. | No change. |

## Not in scope

- The section, its states and the page wiring: later commits of this PR.
- Until #3850 is deployed the backend has no health route, so the call fails; the section's error state (a later commit) is what a user would see.
