# test(infrastructure): fail when a Lambda imports outside its package (#3302)

Issue: #3302
Reviewed: staged diff, one new file (backend/test/infrastructure/lambdaImportBoundary.test.js)
Result: 0 blocking, 1 fix now (fixed), 3 follow-up

## Findings

| Verdict | Where | Finding | Decision |
|---|---|---|---|
| FIX NOW (6/10) | lambdaImportBoundary.test.js:9-10 and the last `it.each` | The fixtures exercise the resolver, not the extraction regex. If the regex stopped matching, `findViolations` would return [] for every package and the suite would stay green. Only the one-off mutation check proves the regex works today. | Fixed in this pull request: the extraction is now `extractRelativeSpecifiers`, and an inline-source test feeds it `import ... from`, `export * from`, `require()` and `await import()` plus a `database` import, expecting exactly the four relative specifiers. Dropping the `require` alternative from the regex made that test fail. |
| FOLLOW-UP (5/10) | lambdaImportBoundary.test.js:10 | Specifiers built from `new URL("../x", import.meta.url)`, `createRequire(...)` or an interpolation-free template literal in `import(`...`)` are not seen. No current file uses them. | Deferred until a function does. |
| FOLLOW-UP (5/10) | lambdaImportBoundary.test.js:7 | `generated/` is skipped, but deploy.yml packages it (staticPageBundle.mjs is written there before the zip). Agreed exclusion, since the bundle is built output. | Accepted; revisit if generated files gain relative imports. |
| FOLLOW-UP (4/10) | lambdaImportBoundary.test.js:5 | The scan root comes from `process.cwd()`, so the test only works when Jest runs from backend/. Same assumption as lambdaWorkflowOutput.test.js. | Accepted. |

## Not in scope

- Bare specifiers (`database`, npm packages): they resolve through node_modules, which deploy.yml copies whole.
- Whether the Jest moduleNameMapper for `.shared` should be removed: it hides the same class of bug, but removing it breaks every function test that relies on it. Separate change.
- Non-literal dynamic `import()`: ignored by decision.

## Mutation check

`../../.shared/dsqlRetry.js` changed to `../../../.shared/dsqlRetry.js` in PropertyHandler/business/service/propertyService.js (copy kept in the scratchpad, restored afterwards, sha256 identical before and after).

- The new test failed and named the file and specifier: `PropertyHandler/business/service/propertyService.js imports "../../../.shared/dsqlRetry.js": leaves the package`.
- The PropertyHandler Jest directory produced the same counts on the mutated and on the clean file (the failing suites are not related to the imports), which shows the gap #3745 went through.
