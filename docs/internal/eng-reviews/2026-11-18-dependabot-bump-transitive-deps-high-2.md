# fix(deps): bump transitive dependencies within range to close 29 high Dependabot alerts

Pull request: not opened yet
Issue: none (29 high Dependabot alerts in frontend/web)
Reviewed commit: working tree on e1d0d6cf0
Result: 1 finding, accepted (non-blocking)

## The fix

Second batch after #3944. For 19 transitive dependencies of `frontend/web`, the patched version is inside the range their parents already accept, so no `overrides` entry is needed and `package.json` does not change. The change is:

```
npm update picomatch follow-redirects nanoid immutable svgo browserslist postcss form-data ws flatted body-parser launch-editor source-map-js compression tmp @babel/plugin-transform-modules-systemjs lodash-es rollup jsonpath
```

Alerts closed (29):

```
Package                                   Alerts               Before -> After
-------                                   ------               ---------------
follow-redirects                          #410 #411 #432       1.16.0 -> 1.16.3
nanoid                                    #342 #348 #361       3.3.11 -> 3.3.20
immutable                                 #217 #301 #302       5.1.4 -> 5.2.1
browserslist                              #364 #365            4.28.1 -> 4.29.6
form-data                                 #286 #287            4.0.5 / 3.0.4 -> 4.0.6 / 3.0.5
ws                                        #281 #282            8.19.0 / 7.5.10-7.5.13 -> 8.23.0 / 7.5.14
picomatch                                 #225 #226            2.3.1 / 4.0.3 -> 2.3.2 / 4.0.7
flatted                                   #220 #221            3.3.3 -> 3.4.4
body-parser                               #419                 1.20.4 -> 1.20.9
launch-editor                             #414                 2.12.0 -> 2.14.2
source-map-js                             #404                 1.2.1 -> 1.2.2
compression                               #402                 1.8.1 -> 1.8.2
tmp                                       #269                 0.2.5 -> 0.2.7
@babel/plugin-transform-modules-systemjs  #261                 7.29.0 -> 7.29.8
lodash-es                                 #239                 4.17.23 -> 4.18.1
svgo                                      #218                 2.8.0 -> 2.8.4 (postcss-svgo only)
rollup                                    #206                 2.79.2 -> 2.80.0
jsonpath                                  #198                 1.1.1 -> 1.3.0
```

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `frontend/web/package-lock.json` | The update pulls in more than the 19 named packages: 61 version changes in total. The extra ones are the Babel helpers the new `@babel/plugin-transform-modules-systemjs` needs (7.28/7.29 to 7.29.x), the browser data behind browserslist (`caniuse-lite`, `electron-to-chromium`, `node-releases`, `baseline-browser-mapping`), `escodegen` 1.14.3 to 2.1.0 because `jsonpath` 1.3.0 uses `static-eval` 2.1.1, and a nested `qs` 6.16.2 for `body-parser`. Babel compiles the application code, so this is more than dev tooling. | Accepted. Every change is inside the range its parent declares. `escodegen` 2.x was already used by `jsdom`, so the tree now has one copy instead of two and six nested packages are removed. The production build passes locally and CI runs the test suite on the pull request. |

## Not in scope

These high alerts stay open and need a different approach, each in its own pull request:

- `svgo` 1.3.2 (#312, #376): pinned by `@svgr/plugin-svgo` `^1.2.2`, the fix is in 2.x.
- `postcss` 7.0.39 (#326, #327): old copy from the react-scripts tree, the fix is in 8.x.
- `path-to-regexp` (#190, #191, #235): `router` pins 0.1.7 exactly.
- `underscore` (#216): `jsonpath` 1.3.0 pins 1.13.6 exactly, the fix is 1.13.8.
- `lodash` 4.17.21 (#238): pinned exactly by `@aws-amplify/ui`.
- `serialize-javascript` (#215), `webpack-dev-middleware` (#389), `image-size` (#380, #381), `node-fetch` (#187), `nth-check` (#186): need a major version.
- `extract-zip` (#347, #369) and `picomatch` (#463): no patched version yet.

## Verification

- `git diff --stat`: only `frontend/web/package-lock.json` changes. `package.json` is unchanged.
- Packages added: `underscore` 1.13.6 (hoisted from `jsonpath`), nested `body-parser/qs` 6.16.2 and `postcss-svgo/sax` 1.6.1. Removed: `@trysound/sax`, the nested `axios/form-data`, `jsdom/escodegen`, `jsdom/source-map`, and the five nested dependencies of the old `escodegen` 1.x.
- All 29 alerts above resolve: every installed copy of the package is outside the vulnerable range.
- `npm run build` succeeds locally (with a placeholder `src/aws-exports.js`, which is gitignored and was removed afterwards).
