# fix(deps): bump backend dev dependencies within range to close 11 high Dependabot alerts

Pull request: not opened yet
Issue: none (11 high Dependabot alerts in backend/package-lock.json)
Reviewed commit: working tree on e9eb9c9d9
Result: 1 finding, accepted (non-blocking)

## The fix

Four transitive dependencies in `backend/package-lock.json` account for 11 high alerts. All patched versions are inside the ranges their parents accept, so `backend/package.json` does not change. The change is `npm update brace-expansion js-yaml browserslist @babel/plugin-transform-modules-systemjs` in `backend/`.

```
Package                                   Alerts                              Before -> After
-------                                   ------                              ---------------
brace-expansion                           #323 #330 #349 #351 #382 #384       1.1.12 / 2.0.2 -> 1.1.22 / 2.1.8
js-yaml                                   #318 #340 #377                      3.14.2 -> 3.15.2
browserslist                              #363                                4.24.5 -> 4.29.6
@babel/plugin-transform-modules-systemjs   #180                                7.27.1 -> 7.29.8
```

25 version changes in total. Besides the four packages above, the update pulls in the Babel helpers the new plugin needs (7.27.x to 7.29.x), the browser data behind browserslist (`caniuse-lite`, `electron-to-chromium`, `node-releases`, `update-browserslist-db`) and two `@jridgewell` source-map helpers. It adds `@babel/helper-globals` and `baseline-browser-mapping` and removes `@jridgewell/set-array`.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `backend/package-lock.json`, `node_modules/typeorm/node_modules/brace-expansion` | All changes are dev dependencies (Jest, Babel) except one: the copy of `brace-expansion` under `typeorm` (2.0.2 to 2.1.8) is a runtime dependency, used through `minimatch` when TypeORM resolves entity and migration paths. | Accepted. It stays inside the range `minimatch` declares (`^2.0.2`), and the change is the security fix itself. The backend test suite runs in CI on this pull request (`test.yml` triggers on `backend/**`). |

## Not in scope

- `sharp` 0.33.5 to 0.35.5 (#306, #309, #371, #373, #407, #408). `sharp` is a direct runtime dependency of the PropertyHandler Lambda (`propertyImageRepository.js` resizes uploaded photos), and the bump crosses 0.x minor versions with native binaries. It needs its own pull request with a check of the Lambda packaging and a manual image-upload test.

## Verification

- `git diff --stat`: only `backend/package-lock.json` changes. `backend/package.json` is unchanged.
- All 11 alerts above resolve: every installed copy of the package is outside the vulnerable range.
- The backend tests were not run locally, because they call AWS with the configured credentials. CI runs them on the pull request.
