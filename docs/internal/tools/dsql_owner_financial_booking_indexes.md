# Owner financial booking query indexes

## Purpose and query shape

PR #4036 adds a paginated Owner Statements source-data query. It scopes bookings by the authenticated host and owned property IDs, then selects records whose stay overlaps the reporting window or whose booking creation time falls inside it.

The relevant access path is:

~~~sql
WHERE booking.hostid = :hostId
  AND booking.property_id IN (:...propertyIds)
  AND (
    (booking.arrivaldate < :periodEndMs AND booking.departuredate > :periodStartMs)
    OR
    (booking.createdat >= :periodStartMs AND booking.createdat < :periodEndMs)
  )
ORDER BY booking.createdat ASC, booking.id ASC
~~~

The two indexes target the two date branches independently:

- `booking_owner_financial_created_idx` keys on `(hostid, property_id, createdat, id)` for host/property scope, creation-time filtering and the tie-breaker ordering.
- `booking_owner_financial_stay_idx` keys on `(hostid, property_id, arrivaldate)` and includes `departuredate` for the second stay-overlap predicate.

The same two indexes with `_test` suffixes are created in `test.booking`. This adds two indexes per schema; it does not change any existing booking columns or data.

## Important deployment notes

- This follow-up is related to Owner Statements issue #633 and should be applied after feature PR [#4036](https://github.com/domits1/Domits/pull/4036).
- The JavaScript file is a migration record; repository runbooks are the manual deployment source. Nothing in this repository automatically executes these migration classes.
- Aurora DSQL index creation is asynchronous. Run each DDL statement in its own autocommit operation. Create the test indexes first, wait for both jobs to complete, then create and wait for the main indexes.
- Index activation updates the catalog. Keep deployment traffic quiet during activation; concurrent transactions referencing objects in the same namespace can see a catalog concurrency error.
- An unsuccessful index build can leave an invalid index. Drop the invalid index before retrying.

## Pre-flight

Confirm the money/schema changes from #4036 are deployed before the feature code, and check for active DSQL jobs:

~~~sql
SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing')
  AND object_name LIKE '%booking%';
~~~

Check whether any of the new index names already exist and inspect their validity:

~~~sql
SELECT pg_class.relname AS index_name,
       pg_index.indisvalid AS is_valid,
       pg_get_indexdef(pg_index.indexrelid) AS index_definition
FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indexrelid
WHERE pg_index.indrelid IN ('test.booking'::regclass, 'main.booking'::regclass)
  AND pg_class.relname LIKE 'booking_owner_financial_%'
ORDER BY pg_class.relname;
~~~

If a named index already exists and is invalid, drop it before running the corresponding create statement. If it is valid and its definition matches, do not recreate it.

## Apply

Run each statement separately. Record the returned `job_id`; poll `sys.jobs` until it reports `completed` before proceeding to the next statement.

~~~sql
CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_created_idx_test
ON test.booking (hostid, property_id, createdat, id);

CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_stay_idx_test
ON test.booking (hostid, property_id, arrivaldate) INCLUDE (departuredate);

CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_created_idx
ON main.booking (hostid, property_id, createdat, id);

CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_stay_idx
ON main.booking (hostid, property_id, arrivaldate) INCLUDE (departuredate);
~~~

## Verify

Both indexes in both schemas must be valid:

~~~sql
SELECT pg_class.relname AS index_name,
       pg_index.indisvalid AS is_valid,
       pg_get_indexdef(pg_index.indexrelid) AS index_definition
FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indexrelid
WHERE pg_index.indrelid IN ('test.booking'::regclass, 'main.booking'::regclass)
  AND pg_class.relname LIKE 'booking_owner_financial_%'
ORDER BY pg_class.relname;
~~~

Then run `EXPLAIN ANALYZE VERBOSE` for the source-data query with a representative host, owned property and reporting window in each schema. Replace the example literals below with real test data:

~~~sql
EXPLAIN ANALYZE VERBOSE
SELECT booking.id, booking.createdat, booking.arrivaldate, booking.departuredate
FROM test.booking booking
WHERE booking.hostid = 'REPLACE_WITH_TEST_HOST_ID'
  AND booking.property_id IN ('REPLACE_WITH_TEST_PROPERTY_ID')
  AND (
    (booking.arrivaldate < 1796083200000 AND booking.departuredate > 1793491200000)
    OR
    (booking.createdat >= 1793491200000 AND booking.createdat < 1796083200000)
  )
ORDER BY booking.createdat ASC, booking.id ASC
LIMIT 101;
~~~

Confirm the plan uses the created-time or stay-overlap index for the applicable branch and does not scan the whole booking table for a representative data set. Record the plan and DPU estimate with deployment evidence. A small table may correctly use a sequential scan; use representative volume before deciding whether the index is effective. The indexes improve access paths but do not guarantee that the optimizer will choose them for every parameter set.

## Rollback

Roll back application code first if the query is being removed. Drop each index separately:

~~~sql
DROP INDEX IF EXISTS main.booking_owner_financial_stay_idx;
DROP INDEX IF EXISTS main.booking_owner_financial_created_idx;
DROP INDEX IF EXISTS test.booking_owner_financial_stay_idx_test;
DROP INDEX IF EXISTS test.booking_owner_financial_created_idx_test;
~~~

This rollback leaves the booking schema and stored data unchanged.
