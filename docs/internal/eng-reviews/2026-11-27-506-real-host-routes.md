# feat(distribution): wire three host routes to the real backend behind REACT_APP_REAL_DISTRIBUTION (#506)

Issue: #506
Base: `acceptance` (after #4065)
Reviewed: the staged diff, before the commit (27 Nov)
Result: no blocking findings; every non-blocking finding decided below

Enes asked for one small PR that wires `GET /host/listings`, `POST .../connect-session` and `POST .../channels/refresh` to the real backend. `enableDistribution` stays mock.

## What changes

| File | Change |
|---|---|
| `hostDistributionRealApi.js` (new) | The three real calls through `requestChannex`, and `normalizeListing` |
| `hostDistributionApi.js` | `USE_REAL_HOST_DISTRIBUTION_API` from `REACT_APP_REAL_DISTRIBUTION === "true"`; `MOCK_HOST_DISTRIBUTION_ENABLED` follows it; the three exports pick real or mock |
| `channexApi.js` | `requestChannex` is exported |

## Flow

```
REACT_APP_REAL_DISTRIBUTION unset (production, Jest)   -> flag false, tab off, all mock
REACT_APP_REAL_DISTRIBUTION="true"                     -> flag true, cards shown
                                                          getHostListings / refreshChannels / createConnectSession -> real
                                                          enableDistribution                                       -> mock
```

The backend sends `readiness.missing` and `timezone` at the top level of a listing. `normalizeListing` moves them into `distribution`, where the frontend reads them. A value already inside `distribution` wins.

## Tests and mutation checks

Folder tests, then the full web suite: only `panoramaElitePagesPin` fails, as on `acceptance`. Each mutation turned a test red:

| Mutation | Caught by |
|---|---|
| Wrong path (connect-session, channels/refresh, host/listings) | `hostDistributionRealApi.test.js` |
| Env switch ignored | `hostDistributionApiSwitch.test.js` |
| `normalizeListing` skipped in the list or in refresh | `hostDistributionRealApi.test.js` |

## Findings and decisions

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | `hostDistributionApi.js:190` `enableDistribution` | It stays mock while the three reads are real, so with the env on, a turn-on would change only the mock | No hook calls `enableDistribution` yet (`useConnectFlow.js:62` marks where PR B2 inserts it), so no host can reach this. The enable PR wires it |
| Checked | `hostDistributionApi.js:17-20` | Production behaviour: the flag is `false` unless the build sets the env to exactly `"true"` | Covered by `hostDistributionApiSwitch.test.js` (unset, `"false"`, `"1"` all off) and the existing "stays off by default" test |
| Non-blocking | `hostDistributionRealApi.js:25` | A missing `propertyId` becomes the path segment `undefined` | Same as the mock; the callers always pass a listing's id. Not changed |
| Non-blocking | `hostDistributionApiSwitch.test.js:44` | `jest.restoreAllMocks()` is not in a `finally`, so a failed assertion leaves the `setTimeout` spy in that file | The spy is local to this one file. Not changed |

## Not in scope

- `enableDistribution` and `disconnectChannel`: later pull requests (Enes asked for the three routes only).
- Removing the mock: the hooks and Jest still use it.

## What already exists

`requestChannex` handles the auth header, the base URL and the error shape; this PR exports it and reuses it. The mock already returns the shapes the real routes answer, so hooks and components do not change.

## Failure modes

| Path | Failure | Test | Handling | Host sees |
|---|---|---|---|---|
| `getHostListings` | Answer without a `listings` array | yes | passed through | the caller rejects it, as before |
| `createConnectSession` | 409 from the backend | yes | error passes through unchanged | the existing connect error messages |
| `refreshChannels` | Answer without a `listing` | no | passed through | the caller handles it, as for the list |
