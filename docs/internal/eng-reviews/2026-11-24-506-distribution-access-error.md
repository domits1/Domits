# feat(distribution): tell a failed access check apart from "no access" on the Distribution guard (#506)

Issue: #506 (follow-up from #3917)
Reviewed commits: `686993470` (classification), `553ddb0e4` (guard)
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `channexCertificationAccess.js`, `loadChannexAccessState` and `loadChannexAccess` | The signed-in-user lookup now exists twice. The sidebar function was left untouched on purpose, so the sidebar is byte-for-byte unchanged. | Accepted. A shared helper can follow as its own refactor. |
| P3 (6/10) | `channexCertificationAccess.js`, `catch { return CHANNEX_ACCESS_STATE.DENIED; }` around `Auth.currentAuthenticatedUser()` | Every Auth rejection counts as denied, including a token refresh that fails on the network. Telling them apart needs matching Amplify error strings. | Accepted, to keep the change small. |
| P3 (6/10) | `channexCertificationAccess.js`, `isDeniedStatus` | A 401 from an expired session reads as "not available", and Retry cannot fix it. | Accepted: a 401 means the token has no usable user. |
| P3 (6/10) | `ChannexInternalRoute.jsx`, `loadChannexAccessState().then(setState);` | No `.catch`. The function catches every path today, so it never rejects. A future edit that lets it reject would leave the guard on "Checking…" with nothing logged. | Accepted. The access test pins that every failure returns `ERROR`. |
| P3 (6/10) | `ChannexInternalRoute.test.jsx`, `jest.mock` | The mock repeats the `CHANNEX_ACCESS_STATE` values. | Accepted. `requireActual` would load `Auth` in the guard test. |

## Architecture and data flow

The guard stays a UX layer. The backend allowlist is the real protection for every `/integrations/channex/*` route, and it is unchanged. `GET /integrations/channex/admin-access` is not a protected route, so a non-allowlisted user gets `200 { allowed: false }`, never 403. A 401 means the token has no user.

```text
ChannexInternalRoute ── loadChannexAccessState() ── Auth user ──▶ GET admin-access

  Auth rejects / no sub ......................... denied
  { allowed: true } ............................. allowed  ──▶ page
  { allowed: false } or status 401/403 .......... denied   ──▶ "not available"
  no status (network), 5xx, other 4xx,
  empty or non-boolean answer ................... error    ──▶ sentence + Retry

Pages2 sidebar ── loadChannexAccess() (boolean, unchanged) ── hidden on denied and on error
```

Retry sets the state to checking, so the button is gone while a check runs and cannot be clicked twice. The access function logs the real error with `console.error` for the error state only. Denied logs nothing.

## Not in scope

- Redirecting to sign-in on a 401.
- Matching Amplify error strings to tell a refresh failure from a signed-out user.
- Backoff on Retry. Each click is one cheap read-only GET and cannot overlap.
- Making the boolean functions delegate to the new one.

## What already exists

- `requestChannex` already puts `status` on the error, so no API change was needed.
- The guard reuses `chdist-btn chdist-btn--primary`, `host-chdist__error` and the `<output>` checking sentence. No CSS was added.

## Failure modes

| Failure | Test | Handling | What the host sees |
|---|---|---|---|
| Network failure, 5xx or other 4xx | yes | `ERROR`, logged | Error sentence and Retry |
| Empty, text or non-boolean answer | yes | `ERROR`, logged | Error sentence and Retry |
| `allowed: false`, 401/403, signed out | yes | `DENIED`, not logged | "Distribution isn't available for this account." |
| Retry double-clicked | yes | Button hidden while checking | One request |
| Unknown state value | yes | Default-deny | "Not available" |

No critical gap.

## Mutation checks

Each mutant was applied, a test went red, and the change was reverted.

- A 5xx classified as denied, `allowed: false` as error, a truthy `allowed` accepted, a signed-out user as error, and 403 not denied: all caught by `channexCertificationAccess.test.js`.
- Denied showing the error UI, error showing the denied sentence, the error sentence losing `role="alert"`, and the not-allowed fallback removed: all caught by `ChannexInternalRoute.test.jsx`.
- Retry not resetting to checking (double-click), and Retry doing nothing: caught.
- `loadChannexAccess` returning true on a throw: caught by the existing `Pages2` and `channexadmin` tests.

## Tests

The frontend/web suite has one failure, `panoramaElitePagesPin.test.jsx`, which fails the same way on `origin/acceptance`.
