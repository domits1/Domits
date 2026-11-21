# fix(deps): bump shell-quote override to 1.11.0 (Dependabot alert #409)

Pull request: not opened yet
Issue: none (Dependabot alert #409)
Reviewed commit: 16859e314
Result: 1 finding, accepted (non-blocking)

## The fix

`frontend/web/package.json` pins `shell-quote` to an exact version in `overrides` (added in #3165). That pin held every resolution at 1.10.0, so Dependabot reported "cannot update shell-quote to a non-vulnerable version" for alert #409 (CVE-2026-102422, command injection in `quote()`). This change raises the pin to the patched 1.11.0. The lockfile changes only the `version`, `resolved` and `integrity` lines of `node_modules/shell-quote`.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (9/10) | `frontend/web/package.json:140` | `"shell-quote": "1.11.0"` is again an exact pin. A future patched release (for example 1.11.1) will be blocked the same way 1.11.0 was, and nothing signals when the pin can be removed. | Accepted. Kept exact to match the existing convention in this `overrides` block (`websocket-driver` is pinned exactly too) and to keep this security fix minimal. Whether overrides should use caret ranges is a separate decision for the owner of #3165. |

## Not in scope

- Switching overrides to caret ranges (`^1.11.0`). See the finding above.
- Removing the override entirely. `react-dev-utils` (`^1.7.3`), `launch-editor` (`^1.8.3`) and `react-devtools-core` (`^1.6.1`) would all resolve to 1.11.0 on their own, but removing it changes more of the lockfile than this fix needs.
- The other open Dependabot alerts. They are handled in separate pull requests.

## Verification

- `npm ls shell-quote` shows `shell-quote@1.11.0` for all three dependents (`react-dev-utils`, `launch-editor`, `react-devtools-core`).
- `git diff --stat`: `package.json` 1 line, `package-lock.json` 3 lines. No packages added or removed.
- `npm run build` succeeds locally (with a placeholder `src/aws-exports.js`, which is gitignored and was removed afterwards).
- `shell-quote` is used only by development tooling (dev server, error overlay, React DevTools) and is not part of the production bundle.
