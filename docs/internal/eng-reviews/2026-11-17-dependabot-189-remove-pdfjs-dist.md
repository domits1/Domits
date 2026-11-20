# fix(deps): remove unused pdfjs-dist (Dependabot alert #189)

Pull request: not opened yet
Issue: none (Dependabot alert #189)
Reviewed commit: working tree on 766766ae9
Result: no blocking findings

## The fix

Dependabot alert #189 (high, CVE-2024-4367) reports arbitrary JavaScript execution when PDF.js opens a malicious PDF. `frontend/web` depends on `pdfjs-dist` `^2.14.305`; the patch is in 4.2.67.

No code in the repository uses the package. `git grep -i pdfjs` on `acceptance` finds only the dependency line in `frontend/web/package.json`, and no other package depends on it. It was added in May 2025 (3f4a78adb) and never imported. Instead of a major upgrade from 2.x to 4.x, this change removes the dependency with `npm uninstall pdfjs-dist`.

The lockfile loses three entries: `pdfjs-dist` and its two dependencies `dommatrix` and `web-streams-polyfill`, which nothing else uses. Nothing is added and no other entry changes.

## Findings

No findings.

## Not in scope

- Upgrading to `pdfjs-dist` 4.x. Not needed while nothing uses the package. If PDF rendering is needed later, add a current version at that point.
- The other open Dependabot alerts. They are handled in separate pull requests.

## Verification

- `git grep -n -i pdfjs` outside `package-lock.json` returns only the removed `package.json` line.
- `git diff --stat`: `package.json` 1 line removed, `package-lock.json` 35 lines removed, 0 added.
- `npm run build` succeeds locally ("Compiled successfully", with a placeholder `src/aws-exports.js`, which is gitignored and was removed afterwards).
