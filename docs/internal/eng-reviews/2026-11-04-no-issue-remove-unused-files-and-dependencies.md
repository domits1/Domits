# Remove unused files and dependencies

Pull request: #3785  
Reviewed against: `acceptance` at `c7c651a312a2538e40e39c71d609e9884470b46d`  
Scope: repository cleanup and frontend dependency cleanup

## Findings and decisions

| Area | Finding | Decision |
|---|---|---|
| Tracked editor artifacts | Tracked macOS `.DS_Store` and JetBrains project files are repository noise. | Remove them and add `*.iml` to `.gitignore`. |
| Legacy and duplicate files | The removed placeholder/base components, duplicate accommodation card, backend debug helper, and old Cypress scaffolding have no remaining incoming references. | Remove the unused files. Keep the active UI components and root Cypress configuration. |
| Cypress setup | Nested Cypress configs and example support/fixture scaffolding duplicate the active setup. | Remove the nested configs and scaffolding; retain the live Cypress test suite. |
| Internal documentation | The selected internal workflow, TypeORM, podcast setup, and AI tooling notes are obsolete and have no remaining references. | Remove the obsolete documents. |
| Frontend dependencies | Review feedback confirmed that the 14 removed packages are not imported anywhere in the frontend or its configuration. | Remove the unused direct/peer dependency declarations. |
| Frontend lockfile | The lockfile contained packages no longer reachable from the remaining dependency declarations. | Prune the 57 unnecessary lockfile entries while retaining packages still required transitively. |
| Cypress command | The `cypress:open` script pointed at an invalid path. | Correct it to invoke `cypress open`. |

## Changes intentionally excluded

- `frontend/web/src/outdated/` and `frontend/web/src/dotenv.js` are already removed by merged PR #3761. They are therefore not part of this PR's diff.
- The old duplicate homepage spec paths are not changed here. Merged PR #3755 provides the active `homePage.cy.js`; this PR preserves that file and its current assertions.
- The active root Cypress configuration, active UI components, root `package.json`, and large binary `.gitkeep` files remain untouched.

## Risk and verification

- No application/business logic is changed by this cleanup.
- The main validation risk is dependency/lockfile consistency after removing packages. The frontend CI install, tests, and build must pass on the updated branch.
- Local npm install, build, and test commands were not run for this review.
- The PR review confirmed that the removed package names have no frontend/config imports and that no remaining repository files reference the deleted paths.

## Review result

The remaining deletions and manifest changes are isolated cleanup changes. The merged changes from #3755 and #3761 are retained from the current `acceptance` base rather than duplicated in this PR.
