# feat(distribution): guard the Distribution route with the Channex allowlist check (#506)

Pull request: #3917
Issue: #506
Reviewed commits: `c110ae303` (refactor), `9e196a6c1` (guard)
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `frontend/web/src/features/hostdashboard/channexadmin/channexCertificationAccess.js:21` | `await Auth.currentAuthenticatedUser()` sits outside the `try/catch`, so `loadChannexAccess` rejects for a signed-out user. The sidebar absorbs this with `.then(isAllowed, () => false)`, but a new caller that did not would stay on "Checking…" forever. | Fixed in `9e196a6c1`: the guard catches the rejection and denies. Covered by the test "denies access when the user lookup rejects". |
| P3 (6/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/components/ChannexInternalRoute.jsx:15-27` | The access check re-runs on every mount, so each return to the tab repeats one read-only `GET /integrations/channex/admin-access`. | Accepted, because the call is cheap and the answer cannot go stale. Revisit if PR 3 to 6 requests make it noticeable. |

## Architecture and data flow

The guard is a UX layer. The backend allowlist (`CHANNEX_CERTIFICATION_USER_IDS`) is the real protection for every `/integrations/channex/*` route, and it is unchanged. The page component only mounts after the check passes, so a non-allowlisted user triggers no Channex request other than the access check.

```text
/hostdashboard/distribution
        │
        ▼
ChannexInternalRoute ── loadChannexAccess() ── Auth sub ──▶ GET admin-access
        │                                                        │
        ├── pending ─────▶ "Checking your access to Distribution…"
        ├── denied / error ▶ "Distribution isn't available for this account."
        └── allowed ─────▶ HostChannelDistribution (usual read-only GETs)
```

## What already exists

- `checkChannexCertificationAccess` already does the allowlist lookup and returns `false` on any error. It is reused unchanged.
- The sidebar already had the same user lookup as a private function. It moved into `channexCertificationAccess.js` as `loadChannexAccess` (no behaviour change, separate commit) so the link and the route share one check instead of two copies.
- The existing `host-chdist` styles are reused, so there is no new CSS.

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| Access lookup is slow | Test for the pending state | The user sees "Checking your access to Distribution…" and no page content. |
| User is signed out, so the user lookup rejects | Test "denies access when the user lookup rejects" | The guard denies. The user sees "Distribution isn't available for this account." |
| Network error or 403 from `admin-access` | Denied-state test, route-level denied test | The helper returns `false`, so the user sees the same sentence. The sentence is worded to be true for both cases. |
| Backend returns something other than `allowed: true` | Test for the strict `true` check | Treated as denied. |

## Performance

One extra read-only GET each time the route mounts, in parallel with the sidebar's own lookup. No data-dependent cost.

## Not in scope

- Changing `checkChannexCertificationAccess` to tell a network failure from a 403. It would also change the sidebar. Follow-up for a later PR.
- Guarding `admin/channex-diagnostics` at the route. It already gates inside its page.
- Sharing the access result between the sidebar and the guard in one context, to avoid the repeated GET.
- 9 failing tests in `listingDetails2.test.js` and the existing Prettier warnings on `mainDashboardHost.js` and `channexAdminRoute.test.jsx`. Both are present on untouched `origin/acceptance` (`ce716e4fa`). The files were not reformatted, to keep the diff small.
- Backend code, the allowlist, and any Channex write route. `MOCK_CONNECT_FLOW_ENABLED` stays `false`.
