# refactor(property): add create tests and optional transaction manager to property repositories (#3921)

Pull request: #3935
Issue: #3921 (part 1 of 2, the issue is closed by part 2)
Reviewed commits: `541c0e5ff` (tests of `propertyService.create`), `08cb91ace` (optional transaction manager)
Result: no blocking findings

Part 2 puts the writes of `propertyService.create` in one transaction with `withDsqlRetry`. This part only prepares it: it pins what `create` does today and lets the repositories take a transaction manager. `create` still passes none, so nothing changes at runtime.

## Findings

Review of `541c0e5ff` (the line numbers are those of the test file as first staged; the commit contains it after the fixes below):

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `backend/test/PropertyHandler/propertyService.create.test.js:67` | "Saves the base listing first" only checked that the base write *started* first. With `await this.createBasePropertyInfo(property.property)` ([propertyService.js:170](../../../backend/functions/PropertyHandler/business/service/propertyService.js)) turned into a plain call, the test stayed green, although part 2 depends on the base row existing before any child write. | Fixed before the commit: a test holds the base write open and asserts that no child write has started. Mutation check: with the `await` removed, that test fails. |
| P4 (8/10) | `propertyService.create.test.js:100-108` | The test "calls the repositories without a transaction manager" checked 2 of 13 repositories and repeated what `toHaveBeenCalledWith(payload)` in the happy-path test already asserts, because that fails on an extra argument. | Fixed before the commit: removed. |
| P4 (7/10) | `propertyService.create.test.js:110-115` | The title said the destination is mapped "after it is saved", but only the call was asserted. | Fixed before the commit: the order is asserted. Mutation check: mapping before the location insert fails the test. |
| P5 (8/10) | `propertyService.create.test.js:118,128` | Titles read "for a Apartment". | Fixed before the commit. |

Review of `08cb91ace`:

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (9/10) | `backend/functions/PropertyHandler/data/repository/propertyRuleRepository.js:262-264, 298` | `upsertRuleByPropertyId` already takes a manager, but still calls `getRuleById(ruleName)` and `getRuleByPropertyIdAndRule(propertyId, ruleName)` on its own connection. After this change `create` honours the manager end to end and `upsert` does not. | Accepted, because `upsert` is not on the create path and passing the manager there changes behaviour. To do as a follow-up. |
| P3 (6/10) | `propertyRuleRepository.js:77-85`, `:116`, `:159` | The `value_new` probe and the `value_type` fallbacks swallow their error (`} catch { ... }`). Once a manager is passed, a failed probe runs inside the transaction, and on Postgres-compatible databases that can abort the transaction even though the error is caught. The result is cached per instance, so only the first call after a cold start is exposed. Not confirmed for Aurora DSQL. | Accepted for this part, because nothing passes a manager yet (the service tests assert the exact arguments of every create call with `toHaveBeenCalledWith`, which fails on an extra argument). Part 2 must warm these probes on the plain connection before it opens the transaction. |
| P5 (9/10) | `propertyAvailabilityRepository.js:44` | A read-back call was about 150 characters, over the 120 print width. | Fixed before the commit. |

Found while checking the create path, before any code was written:

- None of the 13 `create` methods or the 13 read-back getters has its own `withDsqlRetry` or `client.transaction`, so nothing needed to change for that. The methods that do (`replace…`, `upsertPricingByPropertyId`, `deleteImageByPropertyId`, `transitionStatusWithEvent`, `getLatestRejection`, `getModerationEventsByPropertyId`) are outside the create path and are untouched.
- `propertyPricingRepository.getSchemaName` read `client.options.schema`. A TypeORM manager has no `options`, only `connection.options`, so a pricing insert through a manager would have targeted an unqualified `property_pricing`. It now falls back to `client.connection.options.schema`; a DataSource still reads `options.schema` first. Both are tested, and the manager case fails when the fallback is removed.
- No caller passes an extra argument to the 13 getters, and none hands one over as a bare function value (for example to `.map`), so the new trailing parameter cannot receive a stray value.

## Not in scope

- A test for a child write failing, and the transaction itself: part 2.
- Moving the geocoding and the S3 upload out of `create`, and mapping the destination after the commit: part 2, both best-effort.
- Passing the manager through `upsertRuleByPropertyId` and the other `replace…` and `upsert…` methods: follow-up for the first accepted finding.
- Pinning two quirks of `create` that look unintended: `createAvailability` accepts a missing list while the other child writes throw on one, and `createPropertyTestStatus` ignores a falsy result. Part 2 should decide on them.

## Test run

The new tests are 8 for `propertyService.create` and 28 for the repositories, and they pass. The full backend suite has the same 15 failing suites (11 tests) with and without this change: they need `@aws-sdk/client-cloudwatch` or `fast-xml-parser` (not installed in this checkout) or a valid AWS SSO session (expired), and a few tests that read files as text fail on a mismatch that looks like the CRLF line endings of this Windows checkout (my reading of the output, not verified). `test/PropertyHandler/end-to-end.test.js` is excluded, as in CI.
