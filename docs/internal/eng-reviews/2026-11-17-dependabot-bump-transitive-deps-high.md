# fix(deps): bump five transitive dependencies within range to close 45 high Dependabot alerts

Pull request: not opened yet
Issue: none (45 high Dependabot alerts in frontend/web)
Reviewed commit: working tree on 4821ee356
Result: 1 finding, accepted (non-blocking)

## The fix

Five transitive dependencies of `frontend/web` account for 45 of the open high alerts. Every patched version is inside the range their parents already accept, so no `overrides` entry is needed. The change is `npm update node-forge brace-expansion minimatch fast-uri js-yaml`, which only touches `package-lock.json`.

```
Package          Alerts  Before                 After                  Required by
-------          ------  ------                 -----                  -----------
node-forge           12  1.3.3                  1.4.3                  selfsigned ^1
brace-expansion      10  1.1.12 / 2.0.2         1.1.22 / 2.1.8         minimatch ^1.1.7 / ^2.0.1
minimatch             9  3.1.2 / 5.1.6 / 9.0.5  3.1.5 / 5.1.9 / 9.0.9  eslint, glob, filelist, typescript-estree, ...
fast-uri              8  3.1.0                  3.1.9                  ajv ^3.0.1
js-yaml               6  3.14.2 / 4.1.1         3.15.2 / 4.3.2         eslint, cosmiconfig, svgo, ...
```

Alerts closed: node-forge #229 #230 #231 #232 #399 #433 #434 #435 #436 #440 #451 #452; brace-expansion #324 #331 #336 #350 #352 #354 #390 #391 #392 #393; minimatch #203 #204 #205 #207 #208 #209 #210 #211 #212; fast-uri #305 #308 #332 #345 #346 #358 #359 #388; js-yaml #319 #320 #341 #344 #378 #379.

`npm audit fix` was considered first and rejected: its dry run changes 257 packages and downgrades `react-native` (0.87.1 to 0.80.3) and `ws` (7 to 6).

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `frontend/web/package-lock.json` | `npm update` takes the newest version inside each range, not the minimum patched one (for example `node-forge` 1.4.3 where 1.4.1 is enough, `fast-uri` 3.1.9 where 3.1.7 is enough). These are newer minor and patch releases, so slightly more code changes than strictly needed. | Accepted. All are semver-compatible with the ranges their parents declare, the packages are build and dev tooling, and the newest patch also carries any later fixes. The build passes and CI runs the test suite. |

## Not in scope

- The other high alerts in `frontend/web` (svgo, path-to-regexp, nanoid, immutable, follow-redirects, ws, postcss and others). Several need `overrides` or a parent upgrade and get their own pull requests.
- The high alerts in `backend/` and the Gemfiles.
- `npm audit fix`, see above.

## Verification

- `git diff --stat`: only `frontend/web/package-lock.json` changes (74 lines added, 44 removed). `package.json` is unchanged.
- No package entries added or removed, and no `"peer": true` flags changed. Besides `version`, `resolved` and `integrity`, the only changes are the `funding` field of the new js-yaml releases and the `brace-expansion` range inside the new minimatch releases.
- `npm ls` shows only the patched versions listed above.
- `npm run build` succeeds locally (with a placeholder `src/aws-exports.js`, which is gitignored and was removed afterwards).
