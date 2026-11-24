# fix(distribution): skip the legacy status request while the host distribution preview is on (#506)

Issue: #506
Review feedback: PuoK24 on #3978, "Even when MOCK_HOST_DISTRIBUTION_ENABLED is enabled, the component still executes the existing Channex status hook."
Reviewed commits: `6369acca8` (hook), `56c640632` (view)
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (5/10) | `useChannexDistribution.js`, `if (!enabled) return undefined;` | If `enabled` flips off while a request is in flight, the cleanup cancels it and the internal `loading` stays `true`. The disabled return hides it, and re-enabling sets it again. Production never flips the flag at runtime. | Accepted, no test. |
| P3 (5/10) | `useChannexDistribution.js` | After disable then re-enable, the previous `status` shows until the new answer arrives. `reload()` already behaves this way. | Accepted. |
| P3 (6/10) | `HostChannelDistribution.platformCards.test.js`, first flag-on test | Its `getChannexStatus` mock is now dead, because the status is never requested with the flag on. | Accepted, to keep the diff small. |
| P3 (6/10) | `HostChannelDistribution.platformCards.test.js`, removed tests | They were the only tests that reached the view's `showAccountLevel` guard on its own. With no request that guard cannot be reached from a test. | Accepted. The guard stays as a second line of defence. |

## Architecture and data flow

`useChannexDistribution({ enabled })` follows `useMappedProperties({ enabled })`. When disabled it makes no request and returns `status: null`, `loading: false`, `error: null`, `errorStatus: null`. `reload()` needs no guard, because the effect returns early and a bumped `reloadKey` fires nothing. The view passes `enabled: !MOCK_HOST_DISTRIBUTION_ENABLED`. With the flag off, production behaviour is unchanged.

```text
MOCK_HOST_DISTRIBUTION_ENABLED
   off ──▶ useChannexDistribution({ enabled: true })  ──▶ GET /integrations/channex/status   (as today)
   on  ──▶ useChannexDistribution({ enabled: false }) ──▶ no request, inert values
                │
                └▶ status null ─▶ no status card, no Add channel, no mapping table
                   error null  ─▶ no error, no Retry
```

Requests with the flag on:

| Request | Flag on |
|---|---|
| `getChannexStatus` | not run (this change) |
| `getMappedProperties` | not run: needs `isConnectedOrNeedsAttention`, which needs `showAccountLevel` |
| `getLatestSyncEvidence` | not run: no options, so no selected property |
| `getPropertyMappingRows` (mock, no network) | not run: needs a status |
| `getHostListings` (the new flow) | runs, as intended |
| `useFetchUser` (`Auth.currentUserInfo`) | runs. Not a Channex request, already answered. |
| Route guard `GET admin-access` | runs. It is the access check, not the status request. Already answered. |

## Not in scope

- Removing the `showAccountLevel` guard in the view.
- Cleaning the dead mock in the first flag-on test.
- Gating `useFetchUser` or the route guard's access check.

## What already exists

`useMappedProperties({ enabled })` is the pattern reused. The flag-on test setup (`hostApi` mock, `getHostListings`) was reused.

## Failure modes

| Failure | Test | Handling | What the host sees |
|---|---|---|---|
| Flag on and the status is still requested | yes | none needed | a wasted request |
| Flag off and the status stops loading | yes | none needed | no status card |
| Disabled and `reload()` called | yes | effect returns early | nothing |
| Becomes enabled | yes | loads once, no loading flash | normal load |

No critical gap.

## Mutation checks

Each mutant was applied, a test went red, and the change was reverted.

- Hook: the `enabled` guard removed, the inert return removed, and `enabled` missing from the effect dependencies. All caught by `useChannexDistribution.test.js`.
- View: `enabled: true` always, and `enabled` inverted. Both caught by the view tests. The hook guard removed is also caught by the view test.

## Tests

The frontend/web suite has one failure, `panoramaElitePagesPin.test.jsx`, which fails the same way on `origin/acceptance`.
