# Sort newly approved listings to the bottom of the paginated feeds, `all` and `byCountry` (Piece B)

Pull request: #3893
Issue: #3302
Reviewed commit: 70d79484f, the last of the five code commits (first review); 137441c54, a tests-only commit, for the second round after the PR review (see "Second round: PR review"). This file was first added in `ae867a6b5` and is updated in the commit that carries this text.
Result: no blocking findings in either round. One real bug found and fixed (a pagination cursor from the wrong country). Open follow-ups: [#3890](https://github.com/domits1/Domits/issues/3890), and a client follow-up for the `400` (see "Second round").

Piece A (#3853) sorted the two small feeds, `byType` and the destination pages. Piece B does the same for the two paginated feeds, `GET /property/bookingEngine/all` and `GET /property/bookingEngine/byCountry`. Changing the sort key changes where a keyset cursor has to continue from, which is why this was its own piece.

## What the five commits did

| Commit | Type | What it did |
|---|---|---|
| `95c0e985c` | refactor | Adds `listingPosition.js`: `joinLatestApproval` (one aggregate of the latest `APPROVED` event per property, joined once) and `orderByListingPosition`. No consumer yet. `byType` is untouched and keeps Piece A's correlated subquery. |
| `a4edb4899` | feat | `/all` adopts the sort. The cursor keeps its `{createdAt, id}` shape, and the server reads the cursor row by `id` (`findListingPosition`) and derives its position itself. An unknown id is a `400`. Adds the three-column keyset predicate. Adds the manual smoke script `backend/events/PropertyHandler/listingOrderSmoke.js`. |
| `0d2d5bf42` | chore | Hardens the smoke script, because it writes to the shared `test` schema: it prints the cluster, needs the host typed back before a write, sends all SQL through `read()` and `write()`, and has Jest tests on the rail. |
| `fc05cdfeb` | feat | `byCountry` adopts the sort, the cursor and the `400`. The cursor lookup is scoped to the requested country, so a cursor from another country is a `400`. The lookup refuses any row whose id is not the one asked for. The smoke script gains a `byCountry` feed. |
| `70d79484f` | refactor | The cursor block that both feeds carried is now one function, `applyListingCursor`. No behaviour change. |

Decisions from product (Stefan), recorded because they shape the code: listings that were never approved may come in any order among themselves (the three-column key still keeps today's order for them); a re-approval resets a listing's position to the bottom; a newly approved listing that does not fit in the first page stays out of view until it rises on its own, with no forced visibility.

The branch has 14 commits once this update is committed. The five above are the code. The others, in order: `ae867a6b5` docs (the API doc and the first version of this file); `c712561bd` docs (Piece A correction note); `3cea39738`, `22fffb90d`, `78e82a071` refactors of the smoke script and the shared test scaffolding for Sonar; `e6cfbb382` and `3385ea31d` Sonar configuration (a duplication exclusion for the two symmetric feed-test files); `137441c54` tests that pin the cursor contract (second round); and the docs commit that carries this update.

## The real bug found: a cursor from the wrong country

In the review of `byCountry` the question "what does a cursor id from another country do?" was answered by running it against the `test` schema, not by reading the code. Netherlands holds the real listings, and `Smokeland` holds two smoke rows.

| Request | Result before the fix |
|---|---|
| Netherlands feed, cursor id from the Smokeland feed | `200`, 8 rows, starting at row 179 of 186. 178 listings silently skipped. |
| Smokeland feed, cursor id from the Netherlands feed | `200`, both rows, starting again at row 1. The feed silently restarted. |
| Netherlands feed, a cursor from its own 12th row | `200`, 12 rows, from row 13. Correct. |

This is not a regression from this piece. The old value-based cursor behaved the same way, and the mobile client, the only one that calls `byCountry`, was fixed in #3840 to reset the cursor when the country changes. What this piece changed is that the id-derived cursor makes the situation detectable, so it no longer has to be silent. `findListingPosition` takes an optional `scope` that adds the feed's own join and filter, and `byCountry` passes a country scope. A cursor row outside the country is now treated like a row that does not exist: `400`, `"Unknown pagination cursor."`. The real walk has a permanent step that checks both directions, at the repository and through the controller.

## Correction: a claim made during the work that was wrong

Partway through, the investigation concluded that the existing `byCountry` query could not run in the `test` schema, because its join names the table as the bare string `"property_location"`, and that `byType`'s `"property_type"` join had the same problem. **That was wrong.** It was based on running raw SQL (`SELECT 1 FROM property_location`), which fails on that connection's search path, instead of looking at what the TypeORM query builder generates. The builder matches a bare table name to the registered entity with that table name and renders it schema-qualified, `"test"."property_location"` and `"test"."property_type"`. The original joins are fine.

How it was caught: a mutation run put the join back to the bare string and the real walk still passed, which could not be true if the claim were right. The join change I had made on the strength of the claim was reverted, and the false comment I had written beside it was removed, before commit 3 was reviewed and committed. The join, the country filter and the status filter lines of `getActivePropertiesByCountry` are unchanged by this piece.

The same thing most likely explains an item in Piece A's record. Its appendix says the `property_type` join "is not schema-qualified (generated SQL: `INNER JOIN "property_type" "pt"`)". That exact unqualified rendering appears when a scratch data source registers only the `Property` and event entities, because the builder then has no entity to match the string against. That was reproduced during this work. With the full entity list the real data source renders `"test"."property_type"`. Piece A's record says its SQL was generated without a connection, from entity metadata, but not which entities were registered, so the cause is an inference, but the entry should be read as withdrawn. Piece A's file is not edited here.

Two smaller corrections of the same kind, both caught before they mattered: a test line that printed `exit 0` for refusals because a command substitution had reset `$?` (re-run correctly, the exit code is 1), and a first version of a scope test that passed `undefined` for "no row", which triggered the helper's default row argument, so it never simulated "no row" (found when the test failed for the wrong reason, and fixed to use `null`).

## "Mocked tests can't prove row order": and what this piece did about it

Piece A's record said it plainly: its tests prove the right methods and SQL text, not that rows come out in order, and CI has no database. The same is true of the Jest tests here, which mock the query builder or render SQL without a connection. They prove the shape of the query: they fail if an operator in the keyset predicate changes, but they cannot show that the predicate pages correctly.

This piece went further. Every feed commit was also checked with a real walk against live Aurora DSQL data in the `test` schema, using `backend/events/PropertyHandler/listingOrderSmoke.js`. It seeds ten smoke listings with known timings (never approved, ties on `createdat`, ties on approval, the latest of several approvals, events that are not approvals), then walks the real repository and the real controller:

- the reference order is built without the code under test (Piece A's correlated subquery for `all`, plain SQL for `byCountry`) and checked against an order computed from the seed definitions alone;
- a full page-through, twice, with no duplicates, no gaps and a stable result;
- a resume from every possible cursor position (188 for `all`, 186 for `byCountry`), so every page boundary is exercised, including the ties;
- the cursor at the last row ends with `404`;
- an unknown cursor id is `400`, and so is the controller's string-parameter path; `"null"` strings from an old client give page 1;
- for `byCountry`: the country filter, a country with no properties, and the cross-country cursors above.

Results on the final code: `all` 12 of 12 checks over 188 rows (178 real, 10 smoke, 16 pages), `byCountry` 19 of 19 over 186 rows (178 real, 8 smoke, 16 pages). Five negative controls (breaking each of the three keyset comparisons, removing the `400`, and page size 13) each make the script exit non-zero. A full `cleanup --yes`, fresh `seed`, then both walks round trip ran before the `byCountry` commit was made, which is the first time the fresh-seed path ran.

Still not covered: it runs against the `test` schema only, never `main`; it calls the controller with a stubbed service, so the service's country-name normalisation and the card building are not exercised; it is not in CI, because it needs AWS credentials and writes rows. To run it, see "How to run the walk" below.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `listingPosition.js` `findListingPosition`, before `fc05cdfeb` | A cursor id from another country was accepted and returned a silently wrong page (the table above). | Fixed in `fc05cdfeb`: the lookup is scoped to the country, so it is a `400`. Verified on real data. |
| P3 (9/10) | `listingPosition.js` `findListingPosition` | A scope that used `where()` or `orWhere()` in place of `andWhere()` dropped or widened the id filter, and the lookup returned an unrelated row's position (verified: id `001c7ea6…` for a request about `smoke-piece-b-06`). | Fixed in `fc05cdfeb`: the lookup returns `null` unless the returned row's id is the one asked for. 6 tests, 19 of 19 mutants killed, and on the real database the same scopes now give `null`. |
| P2 (8/10) | `General-Accommodation-FilterFunction/data/propertyRepository.mjs:11-15` | It does not check `response.ok`. The `400` this piece adds for a deleted cursor row (before, a deleted row did not matter) is read as "no more pages", and the Lambda caches a truncated catalog for up to 60 seconds with no error. | Open: [#3890](https://github.com/domits1/Domits/issues/3890). A separate pull request, in another Lambda. |
| P3 (9/10) | `propertyRepository.js`, `propertyLocationRepository.js` | The same cursor block (presence test, lookup, `400`, predicate) was duplicated in both feeds. | Fixed in `70d79484f`. Both walks identical before and after. |
| P3 (8/10) | `listingOrderSmoke.js` `seed` | The fresh-seed path had never run. | Fixed: the cleanup, seed, `all`, `byCountry` round trip ran and passed. |
| P2 (8/10) | `listingOrderSmoke.js` (chore review) | The safety tests proved the rail's function, not that every write passes through it. Deleting the confirmation call before a `DELETE` kept every test green. | Fixed in `0d2d5bf42`: the confirmation lives inside `write()`, the only path the script has to a write. Static tests read the script and fail on a raw `.query(` or an unlisted call. 32 of 32 mutants killed. |
| P3 (9/10) | `smokeSafety.js` `read()` | Its comment said it could not be repurposed into a write. `SELECT … INTO`, `FOR UPDATE`, `setval()` and `pg_terminate_backend()` all passed. | Fixed in `0d2d5bf42`: `INTO` and locking reads are refused. Side effects inside a function call cannot be seen from the text; the comment now says so, and two tests pin it as a known gap. |
| P3 (9/10) | `smokeSafety.test.js` allowlist | The allowlist matches receivers literally named like `repository` or `controller`. It misses `repo.create(…)`, `repository?.create(…)`, `repository["create"](…)`, `new X().create(…)`, other receiver names and aliases. | Accepted. The test's own comment lists these, like the TypeORM-method check above it. It is defence in depth behind `write()`, aimed at an accidental new call. |
| P3 (6/10) | `smokeSafety.js` hints and top-level catch | The refusal hint printed the exact host to paste, and the catch reduced every error to a bare message. | Fixed in `0d2d5bf42`: the hint shows a placeholder. A `RefusedError` prints only its message and any other error keeps its stack. |
| P2 (6/10) | `propertyRepository.js` `getActivePropertiesByType` (an earlier version of commit 1) | `byType` had been moved onto the join helper to give the helper a caller. For a bounded, working feed that adds a scan of the whole event table, a cost with no gain. | Reverted by amending the commit before anything was pushed. `byType` is untouched. |
| P4 (5/10) | `listingPosition.js` id check | When the id check turns a weakened scope into `null`, the `400` text is the generic one, so a broken scope shows up as a `400` on every cursor with no hint why. | Accepted. A log line when a different row comes back would help. Not added. |

## Second round: PR review (Enes)

Branch not rebased: the trial merge with `origin/acceptance` (223 commits ahead of the branch point) had no conflicts, CI tests against `acceptance`, and the new commits are added on top without a force-push.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (9/10) | `listingPosition.js` `applyListingCursor` | A cursor row that no longer exists is a `400`, and the guest's scroll stops. Which listings leave the feed? Read in `propertyService.deleteProperty`: a listing with bookings is archived (`status` change), one without is hard-deleted. | Archived: already works. The unscoped lookup and the `byCountry` scope (`propertyLocationRepository.js`, `inThisCountry`) filter on country only, not status. Pinned in `137441c54`, and both mutants (a status filter in the scope, a status filter in the lookup) turn the new tests red. Hard-deleted: stays the existing `400` with the existing message. Decided with the author: no `errorCode`, no header, no object body (a body change would have to be checked in web, mobile and the filter Lambda). The contract is documented instead. Pinned in `137441c54`, at the repository and at the controller (status, bare string body, headers equal the normal headers). |
| P3 (8/10) | `listingPosition.js` `joinLatestApproval` | The aggregate runs over every `APPROVED` event on every page. | Measured and reported, not changed. See below. |
| P3 (9/10) | `listingPosition.js` keyset | A re-approval between two pages moves the cursor row, so listings between its old and new position are skipped. | Accepted, as already listed in "Known accepted limits". Now shown by a test (`137441c54`) and a note in the API doc. No fix. |
| P3 (7/10) | `propertyController.byCountryCursor.test.js` (own tests, found in this round's gate) | The first version of the new controller test only rejected header names that contain "error", so a header such as `X-Cursor-Reason` would have passed, and it restored its mocks at the end of the test body, so a failing assertion would leak the `console.error` mock. | Fixed before `137441c54`: headers are compared with the normal response headers, and the restore is in `afterEach`. |
| P4 (6/10) | `listingPosition.test.js` re-approval test | The "skips" claim rests on a JS mirror of the first predicate branch (`approvedAt > cursorApprovedAt`), not on the SQL. The mirror cannot drift unnoticed from the parameter it reads (the keyset predicate test pins the SQL), but it is a model. | Accepted. Labelled as a mirror in the test. |

### The contract of the `400`

A `400` on a request that carries a cursor means the cursor row is gone, and the client should restart from page 1. The body is the bare string `"Unknown pagination cursor."`. **No client does this yet.** Checked in the client code: web clears its cursor in the `catch` of `loadMoreProperties` (`frontend/web/src/pages/home/Accommodations.js:91-96`) and stops loading more; mobile throws a generic error and drops the server's message (`frontend/app/Domits/src/services/property/propertyRepository.js:24-26` and `:38-42`); the filter Lambda ends its walk (#3890). **Correction of the first round:** the failure-modes table and the appendix said mobile "shows the message as a toast". The server's text never reaches the user on mobile; whether any toast shows depends on the screen that catches the generic error, which was not checked. A client change is a follow-up; no issue is filed yet.

### `joinLatestApproval`: what was measured

Read-only, against the `test` schema (SELECT and EXPLAIN only):

- Events in the schema: 10 in total (7 `APPROVED` across 6 properties, 2 `REJECTED`, 1 `SUBMITTED`). All 10 are the events of the `smoke-piece-b-*` rows, so the real listings in `test` have no moderation events at all. `property` has 188 `ACTIVE` rows (and 620 `INACTIVE`, 6 `ARCHIVED`, 1 `DRAFT`).
- Indexes on the table: the primary key, which is a covering index (`INCLUDE (property_id, action, actor_id, reason, from_status, to_status, created_at)`), and `property_moderation_event_property_created_idx_test` on `(property_id, created_at)`. **No index covers `(property_id, action)`**, and the second index does not help this query, because the aggregate does not filter on `property_id`.
- Plan: `GroupAggregate` over a `Sort` over a full scan of the table with the filter `action = 'APPROVED'`, 0.6 ms for 10 rows. So the cost is linear in the whole event table, regardless of how many events are approvals or belong to active properties.
- Can it be limited to the page's candidate rows without changing results? Not by the page itself: the sort key is the approval time, so every `ACTIVE` row needs its value before the first 12 can be chosen, and the cursor predicate also needs it for each row it compares. The only change that keeps results identical is to restrict the aggregate to events of `ACTIVE` properties. Whether that gains anything depends on the planner and the ratio of active to inactive properties, and it was not measured. Not clearly safe, not needed at this size, so not changed.
- Limits of this measurement: the `test` schema holds no real moderation history, so it says nothing about the cost on `main` (the smoke script refuses any schema but `test`, and `main` was not read). If it grows, the options are an index on `(action, property_id, created_at)` or the denormalised `approved_at` column already named under "Known accepted limits".

### Open in this round

- Sonar: the 7 new issues were not available to this session (no `gh`, no Sonar access) and were not pasted. Not triaged here.
- Cleanup of the smoke rows: dry run shows 10 properties, 10 moderation events and 10 locations. Not run; waiting for confirmation (see Housekeeping).

### Appendix (confidence 3-4)

- (4/10) A `400` for an out-of-country cursor has the same text as an unknown id, so a developer debugging a stale cursor after a country change cannot tell the two apart. On mobile the server message is dropped (see the second round).

## Known accepted limits

- A listing hard-deleted between two pages (one without bookings; one with bookings is archived and keeps working as a cursor) returns `400` for the next page. **This is new behaviour of this piece, in both feeds, not existing behaviour:** before it the cursor was plain values, so a deleted cursor row did not matter and the request never failed. It is the trigger for #3890. It is rare and corrects itself on the next load, which is why it is documented and not fixed.
- A listing that moves to another country between two pages returns `400` for the next `byCountry` page.
- A listing that is approved again between two pages moves to the bottom. The next page continues from its new position, so a client can jump toward the end of the list.
- The cost of the sort is linear in the number of active listings per request, as the old keyset query was (no index on `createdat` was found in the schema files), plus one aggregate over the event table. Measured on the `test` schema with 188 active rows: a page averages about 53 ms, and that includes its cursor lookup of about 22 ms. Fine at this size. The fix if it grows is a denormalised `approved_at` column on `property`, which is out of scope here.
- The three smoke-script limits stated above (function side effects in `read()`, the naming heuristic of the allowlist, and cleanup deleting by the `smoke-piece-b-` id prefix only).
- `test.property` lacks `bookingtype` and `cleaning_fee`, and `test.property_location` lacks `longitude`, which the entities select. The feeds therefore select only `id` and `createdat`, which is all they use, and the end-to-end suite fails on its `POST` setup in that schema. That was already so, and CI excludes the suite.

## Open follow-up

[#3890](https://github.com/domits1/Domits/issues/3890): `General-Accommodation-FilterFunction` treats a non-200 from `/property/bookingEngine/all` as the end of the catalog. The fix is to throw on `!response.ok` and not cache a failed walk, with a test next to `propertyRepository.cache.test.js`. It is newly reachable through the `400` this piece adds. It is tracked, not closed.

## Not in scope

- ADR: the cursor. Context: the sort key now includes the approval time, and a keyset cursor has to continue from the approval time of its row. The mobile app cannot be forced to update. Options: (a) reuse `createdAt` to carry the approval time, which makes the field lie and makes zero, the common value, falsy in every `&&` check; (b) rename the fields and send the approval time too, with a fallback for old builds, which means four client changes with a deploy order, and a loop in the filter Lambda if it drops the field; (c) keep the `{createdAt, id}` wire shape and let the server read the row by `id`. Choice: (c). Consequences accepted: one extra indexed lookup per page, the position is read at request time, a cursor whose row is gone is a `400`, and the filter Lambda gap.
- `getActivePropertiesByHostId` stays as it is: it is a host-facing feed, not a guest feed.
- `byType`, the destination pages and their joins are unchanged. No client (web, mobile, filter Lambda) changes in this piece.
- Seeding a second real country. `Smokeland` holds only two smoke rows, to give the country filter something to exclude.

## What already exists

- Piece A's `APPROVED` event rule and the `Property_Moderation_Event` entity with its `(property_id, created_at)` index, reused.
- `TypeException`, the codebase's existing `400`, reused for the cursor.
- `PaginatedPropertyMapping`, the controller's cursor parsing and the `NotFoundException` at the end of a feed are unchanged. The controller already turned a missing or `"null"` value into `NaN`.
- The `backend/events/<Function>/` convention for manual runs.

## Failure modes

| Path | Failure | Test | Handling | What the user sees |
|---|---|---|---|---|
| Both feeds | Cursor id matches no property, or the listing was deleted | Yes, unit, real walk and controller | `400` | A clear error in the response. Web stops loading more; mobile gets a generic error (see the second round). |
| `byCountry` | Cursor from another country, or the listing moved country | Yes, unit and real walk | `400` | A clear error. |
| Filter Lambda | A `400` mid-walk | No | None: #3890 | **Nothing: an incomplete catalog for up to 60 seconds.** The one critical gap, open. |
| Both feeds | Slow page as the catalog grows | No | None | Latency only. |
| Cursor lookup | A scope that weakens the id filter | Yes | Returns `null`, so `400` | A `400` on every cursor, loud. |
| Smoke script | Wrong cluster | Partly: the rail makes the host be typed back | The person must recognise the host | By design. |
| Both feeds | A listing is approved again between two pages | No | Accepted | The next page may jump toward the end. |

## Sort and cursor

```
  GET .../all | .../byCountry?country=X   (+ lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId)
       │
       ▼
  cursor present?  needs createdAt AND id; NaN, 0, missing or "null" = page 1
       │ yes
       ▼
  look the row up by id  (byCountry: only if it is in country X) ──not found──▶ 400
       │ position = (approved_at, createdat, id), read from the row
       ▼
  page query: ACTIVE ⨝ latest APPROVED event per property (one aggregate)
       │ WHERE after position:
       │   approved_at >  p                                         OR
       │   approved_at =  p AND createdat <  p.createdat            OR
       │   approved_at =  p AND createdat =  p.createdat AND id < p.id
       ▼
  ORDER BY approved_at ASC, createdat DESC, id DESC   LIMIT 12
       │  (approved_at = COALESCE(latest APPROVED created_at, 0))
       ▼
  cursor out = { createdAt, id } of the last row     (wire shape unchanged)
```

## Verification

- Tests were written first and seen red for the right reason in each commit.
- Mutation checks, all with a scratchpad copy and sha256 before and after, no `git checkout`: helper 8 of 8; `/all` 23 of 23; the smoke script's rail, wrapper and bypasses 32 of 32; `byCountry` 24 of 24 (16 against the unit tests, 8 against the real walk), the script's new write sites 6 of 6, the country scope 12 of 12, then 19 of 19 with the id check; the refactor 21 of 21. Two mutants are equivalent in SQL (ignoring the return value of a builder call, since builders mutate in place) and are killed by contract tests instead.
- Test files added or changed: `listingPosition.test.js` (34), `propertyRepository.getActiveProperties.test.js` (10), `propertyLocationRepository.getActivePropertiesByCountry.test.js` (13), `smokeSafety.test.js` (57). The existing `propertyController.byCountryCursor.test.js` (3) and `propertyRepository.activeByType.test.js` (8) pass unchanged.
- The backend suite had 16 failing suites and 27 failing tests before any change, all environmental: missing `@aws-sdk/client-cloudwatch` and `fast-xml-parser`, live-database tests, an expired AWS SSO session, a SQL-text schema test, and two others. With a live AWS session the final run is 14 failing suites and 20 failing tests, a strict subset, with 6043 passing against 5922 at the start. Two suites, `lambdaRepository.test.js` and `builder-unit-unhappy-path.test.js`, need a database and pass only while the SSO session is valid. With an expired session the same run is back at the starting 16 suites and 27 tests, with 6036 passing. Either way, no suite fails that did not fail before any change, and no new failure appeared at any commit.

## How to run the walk

Needs `aws sso login` and Node 20.6 or newer. From `backend/`:

```
node events/PropertyHandler/listingOrderSmoke.js walk all
node events/PropertyHandler/listingOrderSmoke.js walk byCountry
node events/PropertyHandler/listingOrderSmoke.js seed --target=<host>
node events/PropertyHandler/listingOrderSmoke.js cleanup             (shows what would be removed)
node events/PropertyHandler/listingOrderSmoke.js cleanup --yes --target=<host>
```

`<host>` is the host on the `Connected to` line the script prints. It is typed back on purpose: the script cannot tell a development cluster from a production one. The header of the script says what the rails do and do not cover.

## Housekeeping

The ten `smoke-piece-b-*` properties, their ten moderation events and their ten locations are still in the `test` schema, as real `ACTIVE` listings (eight in Netherlands, two in `Smokeland`). Any guest feed that reads the test schema shows them. Remove them with `cleanup --yes --target=<host>` once the reviewers have run the walk, or before merging if they will not.

Status in the second round: the dry run (`cleanup` without `--yes`) lists 10 properties, 10 moderation events and 10 locations, and the schema holds no other moderation events, so cleanup leaves the event table empty. The delete itself has not been run; it waits for the author's confirmation.
