# fix(property): create a listing in one transaction (#3921)

Pull request: #3958 (part 2 of 2, closes #3921; part 1 is #3935)
Issue: #3921
Reviewed commits: `9e9e9f57d` (rule probes and upsert), `5798801db` (precomputed coordinates and image key), `e40b964a1` (the transaction)
Result: no blocking findings

Part 1 let the 13 repository create methods and read-back getters take a transaction manager. Part 2 makes `propertyService.create` pass one. All rows of a listing are written in one transaction with `withDsqlRetry`, the same pair `transitionStatusWithEvent` uses, so a failure in the middle no longer leaves a property row without its children. The goal is prevention only: old broken rows are not cleaned up.

## What changed

```
create(listing)
  │  warm probes ─▶ geocode ─▶ upload images        no connection held
  ▼
withTransaction ── withDsqlRetry ── client.transaction
  │  property ▶ type ▶ location ▶ details ▶ pricing ▶ check-in ▶ availability
  │  ▶ restrictions ▶ amenities ▶ rules ▶ test status ▶ technical ▶ images
  │  any throw ─▶ rollback      40001 at commit ─▶ run again, up to 3 times
  ▼  commit
destination mapping (best effort, own connection)
```

- Decided with Enes: image upload and geocoding run before the transaction, destination mapping runs after the commit.
- The writes are sequential. A transaction is one connection, so `Promise.all` gains no speed, and on the first failure it would roll back while sibling writes are still running.
- Everything the callback uses (coordinates, uploaded keys, ids) is fixed before the transaction opens, so `withDsqlRetry` can run it again safely. A test checks that a retry does not geocode, upload or warm again and commits each row once.
- An exhausted commit conflict becomes `ServiceUnavailableException` (503), like `transitionWithEvent`.

## Findings

All three reviews ran on the staged diff before each commit.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `propertyRuleRepository.js:90` | The `value_new` probe caches `false` on any error, so one transient failure makes later `time` and `text` rules lose `value_new` until the Lambda restarts. Existing behaviour; `warmProbes` only runs the probe earlier. The new `value_type` probe avoids it: only a missing column (SQLSTATE `42703`) is cached as unsupported, anything else is thrown. | Accepted, to keep commit 1 one behaviour. Follow-up. |
| P3 (8/10) | `propertyPricingRepository.js:82,107` | `weekendRateColumnSupported` only caches `true`. A database without the column re-runs the catalog query on every create. The query succeeds, so it cannot abort the transaction. | Accepted. |
| P3 (7/10) | `propertyRuleRepository.js:175` | `getRuleDefinitionsByNames` calls `getRuleById(ruleName)` without the client, but only for clients without `createQueryBuilder` (test doubles). | Accepted. Folded into the `replaceRulesByPropertyId` follow-up. |
| P3 (6/10) | `propertyImageRepository.js:185` | `create` still mutates its input (`image.key = ...`). | Accepted. Retries are safe because the same `uploadedKey` is assigned each time. |
| P3 (6/10) | `propertyImageRepository.js`, `propertyLocationRepository.js` | The options argument is destructured without a guard, so passing `null` as third argument throws. | Accepted. The service is the only caller. |
| P3 (8/10) | `backend/functions/PropertyHandler/util/geocoding.js:18` | `fetch` has no timeout. A hung Nominatim stalls the create before any write. The same as before; nothing is held open. | Accepted. Follow-up. |
| P3 (7/10) | `propertyService.js:186-187` | Geocoding and uploads now run one after another before the first write. Before, they overlapped with the DB writes. Legacy mode with 60 images at about 150 ms each is about 9 s, under the 29 s API Gateway limit. An estimate, not measured. | Accepted. |
| P3 (7/10) | `propertyService.js:222` | A transient probe failure now fails the create with a 500. Nothing is written. | Accepted. This is the safe side. |

Found while writing the code, before review:

- **An image-key bug avoided.** The first version of commit 2 skipped the S3 upload when `image.key` was set. The request builder requires a client-supplied `key` string on every image (`propertyBuilder.js`, `new PropertyImage(this.property.id, image.key, image.image)`), so the upload would have been skipped for every legacy create and an arbitrary client key stored. The option is now an explicit `uploadedKey`. A test checks that a key from the request body is ignored.
- **Destination mapping inside the transaction would have silently done nothing.** `mapPropertyLocationSafely` reads on its own connection and could not see the uncommitted location row. It returned `no_location` and the error was swallowed. It now runs after the commit.
- **Mutation check.** With the manager removed from the pricing write, the transaction tests fail (several of them, including the one that asserts nothing is written without a manager).

## Not in scope

- **Orphaned S3 objects (accepted limit).** Images are uploaded before the transaction. If the transaction then fails, the objects stay in S3. Context: an upload cannot be rolled back, and holding a transaction open across up to 60 uploads risks the DSQL time limit. Options: upload inside the transaction, upload before and accept orphans, upload before and delete on failure. Choice: upload before and accept orphans, as agreed for a prevention-only fix. Consequence: a failed create can leave unreferenced objects under `images/<propertyId>/`. A listing never points at a missing file. Follow-up: delete the uploaded keys when the transaction fails, or a sweep of unreferenced keys.
- **`replaceRulesByPropertyId`.** Same mixed-connection bug as `upsertRuleByPropertyId` had: `getRuleByPropertyIdAndRule(propertyId, rule.rule)` and `getRulesByPropertyId(propertyId)` run on their own connection inside its transaction. Not on the create path. Follow-up.
- Caching `value_new` support like `value_type` (the P2 above).
- A timeout for the geocoding request.
- Deleting the draft in the same transaction. In presigned mode the controller still deletes the draft after `create`, so a failure there leaves a created listing with a stale draft.
- Cleaning up existing broken rows.
- The two quirks part 1 left open: `createAvailability` accepts a missing list while the other child writes throw on one, and `createPropertyTestStatus` ignores a falsy result. Both are unchanged.

## Aurora DSQL limits

From memory, not verified against the current AWS documentation:

- about 3,000 rows modified per transaction, with secondary-index entries counting toward it
- about 10 MiB of data per transaction
- a 5-minute transaction time limit
- one DDL statement per transaction

A large listing is about 130 rows (60 images, about 40 amenities, about 15 rules, about 15 others), maybe 400 counting index entries, and a few KB of data because images are S3 keys. About 260 statements run sequentially, which should take a second or two. That is well below all of these limits, on these numbers. Confirm the limits before relying on this.

## Test run

New tests: 4 for the rule repository probes and `upsert`, 5 for precomputed coordinates and the uploaded key, 21 for the create transaction (they replace the 8 create tests of part 1). Together they cover: the one-manager happy path, rollback from a middle step (rule, pricing, amenity) and from the last step (image, technical details), retry after a commit conflict, a conflict that does not go away (503), no transaction opened when the upload fails, probes, geocode and upload before the transaction, destination mapping after the commit, and `skipImages`.

Full backend suite, `npm test` in `backend`:

| Branch | Failed suites | Failed tests | Passed tests |
|---|---|---|---|
| part 1 (`fix/3921-create-tests-and-manager`) | 16 | 27 | 6020 |
| this branch | 16 | 27 | 6042 |
| `origin/acceptance` (`362c2ba41`) | 18 | 27 | 5993 |

The failing suites of this branch are the same 16 as part 1. Part 1 recorded the causes as missing packages (`@aws-sdk/client-cloudwatch`, `fast-xml-parser`), an expired AWS SSO session and a live database; in this run I only confirmed the missing `@aws-sdk/client-cloudwatch` module. `test/PropertyHandler/end-to-end.test.js` is excluded in CI. Acceptance fails two suites this branch does not (`createSiteMinderServices` and `siteMinderReservationsReader`); this branch is 67 commits behind acceptance and does not have those files. No suite that passes on acceptance fails here.
