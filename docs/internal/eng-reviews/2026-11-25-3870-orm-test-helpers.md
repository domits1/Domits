# refactor(test): share the ORM consistency helpers and checks

Pull request: (to be opened)
Issue: #3870, split PR A (refactor before the document tables, PR #4046)
Reviewed: working tree on `3870-orm-test-helpers`, on top of `48c8a5da5` (acceptance)
Result: no blocking findings

## What changed

```
before                                         after

propertyOwnerEntity.test.js                    propertyOwnerEntity.test.js
├─ TABLES, SCHEMAS, SOURCES, DROP_SOURCES      ├─ TABLES, SCHEMAS, SOURCES, DROP_SOURCES  (data stays)
├─ 14 SQL-parsing helpers         ───────┐     ├─ describeOrmConsistency({...}) ─────────────────┐
├─ entity / source / drop checks  ───────┤     ├─ status default per source                       │
├─ status default per source             │     ├─ entity default                                  │
├─ entity default                        │     ├─ migration SQL smoke tests                       │
├─ migration SQL smoke tests             │     │  ├─ row ids, conflict keys, smoke query          │
│  ├─ smoke-block parsers (4) ───────────┤     │  │  conditions, negative CHECK rows  (stay)      │
│  ├─ row ids, conflict keys, queries,   │     │  ├─ itEndsEveryTransactionInRollback(sql) ──────┤
│  │  negative CHECK rows                │     │  └─ itCountsOnlySmokeRowsInFinalCheck(sql, n) ──┤
│  ├─ never commits         ─────────────┤     └─ Tables registration                             │
│  └─ zero-rows check       ─────────────┤                                                        │
└─ Tables registration                   │     support/ormConsistencyTestHelpers.js  ◀───────────┘
                                         └───▶ ├─ readOrmFile … dropStatements (14, createTableBlock
                                               │  renamed createTableBlockIndentAware)
                                               ├─ smokeBlocks, statements, parseInsert, inserts
                                               ├─ itEndsEveryTransactionInRollback(loadMigrationSql)
                                               ├─ itCountsOnlySmokeRowsInFinalCheck(loadMigrationSql, expectedCount)
                                               └─ describeOrmConsistency({ tables, schemas, sources, dropSources })
                                                  ├─ describeEntityMappings     2 tests per table
                                                  ├─ describeCreateSources      6 tests per source × table × schema
                                                  └─ describeDropSources        2 tests per drop source
```

- New `backend/test/ORM/support/ormConsistencyTestHelpers.js` (215 lines):
  - The 14 helpers the owner test defined locally, copied verbatim. `createTableBlock` is exported as `createTableBlockIndentAware` (`:23`), and its two callers inside the module (`blockLines` and the no-foreign-key check) are updated. The owner test never called it directly.
  - The smoke-block parsers `smokeBlocks`, `statements`, `parseInsert` and `inserts` (`:83-100`), copied verbatim.
  - `itEndsEveryTransactionInRollback(loadMigrationSql)` (`:102`) and `itCountsOnlySmokeRowsInFinalCheck(loadMigrationSql, expectedCount)` (`:110`). They register an `it`, not a `describe`. The owner test calls them inside its own `describe("migration SQL smoke tests")`, so their full test names stay the same. Wrapping them in a module-level `describe` would have changed the names.
  - `describeOrmConsistency({ tables, schemas, sources, dropSources })` (`:211`): the generic table-driven checks.
- `propertyOwnerEntity.test.js` (16 insertions, 182 deletions) imports from the module and calls the shared functions. The checks specific to this migration stay in the file: the status default per source, the entity default, the smoke assertions (row ids, conflict keys, smoke query conditions, negative CHECK rows) and Tables registration.
- The zero-rows count used to be the literal `4`. It is now `SCHEMAS.length * TABLES.length` (`propertyOwnerEntity.test.js:212`), which is 2 × 2 = 4, so the assertion checks the same number.
- The status default check sits in its own `describe.each(SOURCES)("%s", ...)` in the test file, so its full name stays the same. Only the run order changes.
- `schemaSql.js`, `support/migrationSqlTestHelpers.js`, the Sonar configuration and the ORM source are unchanged.

## Tests

| | before | after |
|---|---|---|
| `propertyOwnerEntity.test.js` | 96 tests, 96 passed | 96 tests, 96 passed, the same 96 full test names (`jest --json`, sorted, `diff` empty) |
| `test/ORM` | 12 suites, 1 failed; 228 passed, 1 failed, 1 todo | identical output |
| full backend suite | 19 failed suites, 28 failed tests, 6877 passed | identical, no new failures and no fewer |

The `test/ORM` failure is `directBookingWebsiteRatePlan.schema.test.js`, which fails the same way on acceptance.

Assertions: a script took every line removed from the owner test (148 lines, excluding imports, blank lines, the status default check and the two count lines) and found each one in the module. It ignores whitespace, `export const` versus `const`, the parameter renames (`TABLES`/`SCHEMAS`/`SOURCES`/`DROP_SOURCES` to lower case, `migrationSql` to `loadMigrationSql`) and the `createTableBlock` rename. 0 lines were missing. The two count lines changed from `.toHaveLength(4)` to `.toHaveLength(expectedCount)`, and the owner test passes 4.

Prettier: the module passes. `propertyOwnerEntity.test.js` reports style issues, and acceptance reports the same ones: the `DROP_SOURCES` row and the smoke tests. All are in lines this change does not touch, so they are left as they are.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (7/10) | `backend/test/ORM/propertyOwnerEntity.test.js:101-118` and `:223-245` on acceptance (`const smokeBlocks = ...` through `const inserts = ...`, `it("ends every transaction in ROLLBACK and never commits", ...)`, `it("counts only the smoke rows ...")`) | The smoke-block parsers and the commit and zero-rows checks were the third and fourth largest duplicated runs on PR #4046 (19 and 16 lines). Leaving them local would have kept the document PR above the 3% duplication gate. | Fixed (decision A): the four parsers are exported from the module (`:83-100`). The two checks are exported as `itEndsEveryTransactionInRollback` (`:102`) and `itCountsOnlySmokeRowsInFinalCheck` (`:110`), and the second takes the migration SQL loader and the expected count. The migration-specific smoke assertions stay in the test file. |
| P2 (6/10) | `test/ORM/support/ormConsistencyTestHelpers.js:60`, `.sort();`, also `:63`, `:75`, `:78`, `:196`; `:105` and `:111`, `await loadSql()` | The IDE's SonarLint reports issues on the module: `.sort()` without a compare function (S2871), `await` on a value it cannot prove is a promise (S4123), `schema` and `table` from the destructured `it.each` rows interpolated in template literals without a known string type (S6551), a nested template literal (S4624) and a backtracking-prone regex (S8786). The same code produced the same issues in the owner test, where it was old code. In a new file every line is new code, so the PR A analysis counts them as new issues. Whether that fails the gate depends on the gate's rating conditions, which are not in the repo. Could be a false positive for S4123 and S6551: `loadSql` returns a promise and `schema` is a string, but the type is not visible to the analyzer. | Accepted: moved verbatim; SonarCloud's PR analysis decides. If the gate fails on these, fix in a separate follow-up commit on this PR. |
| Follow-up (PR #4048, Sonar gate) | `test/ORM/support/ormConsistencyTestHelpers.js:8`, `const compareAsDefaultSort = (left, right) => {`; `:32`, ``const escapedTable = qualifiedTable.replace(".", String.raw`\.`);``; `:77`, `(?:\s+WHERE ([^;]+)\|\s*);` | SonarCloud's analysis of PR A reported 6 issues on the module: `.sort()` without a compare function at the old L60, L75 and L196 (twice), the backtracking regex in `indexesOn` at the old L70, and the nested template literal in `createTableBlockIndentAware` at the old L25. | Fixed in a separate commit without behaviour change. All six `.sort()` calls (including `:70` and `:87`, which Sonar did not list) use `compareAsDefaultSort`. It compares `String(left)` and `String(right)` with `<` and `>` and returns -1, 1 or 0, which is the default order (UTF-16 code units); `undefined` still goes last, because `sort` never passes it to a compare function. The `WHERE` part is `(?:\s+WHERE ([^;]+)\|\s*);` rather than the suggested `(?:\s+WHERE ([^;]*))?;`: the suggestion would stop matching `ON t (a) ;` and would accept an empty predicate. The two alternatives cannot feed each other's backtracking. On a 40,000-character input without `;`, the old regex took 654 ms (quadratic) and the new one 0.06 ms. The escaped table name is computed first. Equivalence check: a scratchpad script ran the old and the new `createTableBlockIndentAware`, `indexesOn`, `checkConstraints`, `expectedIndexes` (suffixes `""` and `_test`) and `expectedChecks` over every `backend/ORM/migrations/*.sql` file and `schema.psql` (61 files, 98 tables, 133 index rows of which 16 have a predicate, 18 CHECK rows, 2 thrown errors). It also ran them over a synthetic file with the edge cases (whitespace before `;`, multi-line predicate, `WHERE ;`, a missing `;`, two statements on one line) and over 500 fuzz cases of `expectedChecks` and `expectedIndexes` with non-ASCII strings and lone surrogates. The output files are byte-identical. `propertyOwnerEntity.test.js` keeps its 96 tests with identical full names, all passing. `test/ORM` and the full suite are identical to acceptance `48c8a5da5` (19 failed suites, 28 failed tests); one run also failed the known flaky `taskService.getUploadUrl.signing.test.js`, which passed three times alone and in a second full run. Prettier is clean on the module. |
| P3 (7/10) | `test/ORM/support/ormConsistencyTestHelpers.js:77`, `(?:\s+WHERE ([^;]+)\|\s*);` | The equivalence proof for the follow-up fix was a throwaway scratchpad script. No committed test covers the edge cases that ruled out the suggested regex (whitespace before `;`, `WHERE ;`, a missing `;`, a multi-line predicate): the only caller, `propertyOwnerEntity.test.js`, has none of them. Replacing the regex with the simpler suggestion would still pass every test. | Accepted: evidence recorded in this review (byte-identical output over all migrations, schema.psql, edge cases and 500 fuzz cases). Add a committed regression test for indexesOn if the regex is changed again. |
| P3 (8/10) | `test/ORM/support/ormConsistencyTestHelpers.js:23`, `export const createTableBlockIndentAware = (sql, qualifiedTable) => {`, and `test/ORM/support/migrationSqlTestHelpers.js:19`, `export const createTableBlock = (sql, qualifiedTable) => {`; `test/ORM/schemaSql.js:16` (`extractCreateTableBlock`, `\n\);`) | Two support modules exported `createTableBlock` with different behaviour. Only the new one accepts an indented closing `);`, which the migration `.js` `up()` output needs. | Fixed (decision 2): renamed to `createTableBlockIndentAware` in the module; its callers in the module are updated, and `propertyOwnerEntity.test.js` had none. Appendix: three CREATE TABLE extractors still exist (`schemaSql.js:16`, `migrationSqlTestHelpers.js:19`, this module), and `smokeBlocks` is now exported with the same body from both support modules (`migrationSqlTestHelpers.js:47`, this module `:83`). Consolidating them changes modules other tests depend on, so it is out of scope. |
| P3 (6/10) | `test/ORM/support/ormConsistencyTestHelpers.js:138`, `expect(metadata.findColumnWithDatabaseName("id").generationStrategy).toBe("uuid");` and `:158`, `"id UUID DEFAULT gen_random_uuid() PRIMARY KEY"` | `describeOrmConsistency` assumes every table has a database-generated uuid `id`. That fits the owner and document tables, not the tables with varchar ids. | Appendix (decision 3): add an option when a caller needs another key shape. |
| P3 (4/10) | `test/ORM/support/ormConsistencyTestHelpers.js:195`, `it("drops every index and table the migration creates, in both schemas", ...)` | The name says "both schemas" while `schemas` is a parameter. Renaming it would change the test names this refactor must keep. | Appendix (decision 4): unchanged. |
| Checked | `support/ormConsistencyTestHelpers.js` | The name does not match `testMatch` (`**/**/**.test.js`), so Jest does not collect the module as a suite. It registers tests only when one of its `describe…`/`it…` functions is called, never on import. | No change |
| Checked | `propertyOwnerEntity.test.js:3-14` | Every imported name is used. `readFileSync`, `path`, `SQL_TYPES` and the local parsers are gone from the file. `DataSource` stays for the Tables registration test. | No change |

## Failure modes

The module runs only in tests. These are its realistic failure modes.

| Failure | Test | Handling | Visible |
|---|---|---|---|
| A future caller passes SQL whose `CREATE TABLE` block the regex does not match | Yes, indirectly | `createTableBlockIndentAware` throws `No CREATE TABLE block found for <table>` | Yes, a failing test that names the table |
| A future caller passes a table whose `id` is not a generated uuid | No | None: two generic tests fail | Yes, but the failure reads as a schema defect rather than a misuse of the helper (appendix, decision 3) |
| A caller passes the wrong `expectedCount` to `itCountsOnlySmokeRowsInFinalCheck` | Yes, the zero-rows test fails | None | Yes, a length mismatch on `count(*)` |
| An edit to the module weakens a generic check | Only through the owner test, which still passes when a check is weakened | None | **Critical gap**, but not new: before this change the same checks lived in one test file with the same exposure. The module is shared, so the blast radius grows with each caller. See Not in scope. |

## Not in scope

- Merging `schemaSql.js`, `migrationSqlTestHelpers.js` and the new module: other tests depend on their current exports, and the task forbids changing `schemaSql.js` and `migrationSqlTestHelpers.js`.
- A self-test for the shared module (mutation cases that must fail): it would guard the module, but it adds tests this refactor promised not to add.
- Fixing the SonarLint issues in the moved code: the code is moved verbatim so the refactor can be read as a change without behaviour change. Adding compare functions to `.sort()` changes the sort order if it is not done exactly as the default (UTF-16 code units, not `localeCompare`). Raised as P2 finding 2.
- Sonar configuration: unchanged by instruction.
- The pre-existing Prettier issues in `propertyOwnerEntity.test.js`.

## What already exists

- `test/ORM/schemaSql.js`: `sorted`, `loadSchemaSql`, `loadMigrationSql`, `extractCreateTableBlock`, `extractCreateTableColumns`, `extractAddColumnNames`, used by `bookingEntity`, `credentialLeaseEntity`, `directBookingWebsiteRatePlan.schema` and `propertyCustomRuleEntity`.
- `test/ORM/support/migrationSqlTestHelpers.js`: `loadMetadata`, `loadMigrationSql`, `createTableBlock`, `sqlColumns`, `sqlColumnDefinitions`, `smokeBlocks`, used by `homeAutomationDeviceAudit`, `homeAutomationEntities` and `propertyModerationEvent`.
- Neither could replace the owner helpers without changing behaviour. Both require an unindented `);`. `sqlColumnDefinitions` treats nullability differently (`NULL` keyword instead of the absence of `NOT NULL`) and does not separate constraint lines. So the new module is a fourth home rather than a reuse. Its `smokeBlocks` has the same body as the one in `migrationSqlTestHelpers.js`.

## Manual check

None needed: test-only change, verified by test names, counts and the verbatim check above.
