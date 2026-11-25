# Finance money precision and Owner Statements source data

Pull request: #4036  
Issue: #633  
Reviewed commit: d55c515  
Result: one finding fixed; one performance finding assigned to follow-up PR #4049 before broad rollout.

## Review passes

Reviewed architecture, code quality, tests and performance. The review covers the branch diff and the Owner Statements source-data query. No live Aurora DSQL cluster was accessed; query plans and index build completion must be verified during deployment.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (10/10) | `backend/functions/property-owners/business/service/service.js:159-162` | The missing-minor-unit warning excluded bookings when both `total_price` and `total_price_minor` were absent. | Fixed in `d55c515`: report every candidate with a null/undefined `total_price_minor`. Regression test covers legacy-only and both-fields-missing bookings. |
| P2 (8/10) | `backend/functions/property-owners/data/repository.js:293-299`; `backend/ORM/schema.psql:127-129` | The new financial-data query filters by host, property and date, but existing booking indexes only cover ID, public reference and idempotency key. This can become a scan bottleneck as booking volume grows. | Accepted as a focused follow-up in [PR #4049](https://github.com/domits1/Domits/pull/4049): add separate created-time and stay-overlap indexes in both schemas, plus a DSQL EXPLAIN deployment gate. Complete before broad rollout. |

## Evidence

Before the amount-warning fix, the filter required a legacy amount as well as a missing exact amount:

~~~js
.filter((booking) => booking.total_price !== null && booking.total_price !== undefined &&
  (booking.total_price_minor === null || booking.total_price_minor === undefined))
~~~

The source-data query uses these access predicates and date branches:

~~~js
.where("booking.hostid = :hostId", { hostId })
.andWhere("booking.property_id IN (:...propertyIds)", { propertyIds })
.andWhere(
  "((booking.arrivaldate < :periodEndMs AND booking.departuredate > :periodStartMs) OR (booking.createdat >= :periodStartMs AND booking.createdat < :periodEndMs))",
  { periodStartMs, periodEndMs }
)
~~~

The existing schema indexes at review time were:

~~~sql
CREATE UNIQUE INDEX ASYNC id_UNIQUE_booking ON main.booking (id);
CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique ON main.booking (public_booking_ref);
CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique ON main.booking (idempotency_key);
~~~

## What already exists

- `currencyAmount.js` is a shared exact-decimal/minor-unit helper used by invoice creation and Channex booking import.
- Booking and Invoice entities preserve legacy amount fields while adding nullable integer minor-unit snapshots.
- Owner source-data reads are scoped to the authenticated host and the owner's effective property assignments.
- Booking candidates are paginated; invoice snapshots are fetched only for the returned booking page.
- Tests cover currency parsing, invoice amounts, refund states, owner authorization, owner scoping and booking query predicates.

## Data flow

~~~text
Host/Admin request
       |
       v
Owner controller -- authorize host
       |
       v
Owner service -- validate owner and reporting window
       |
       +--> ownership assignments --> property IDs
       |
       v
Booking candidates -- host/property/date filters -- bounded page
       |
       v
Linked invoice snapshots + missing-data warnings
       |
       v
Owner Statements source-data response (not accounting totals)
~~~

## Failure modes

| Failure | Test coverage | Handling and user impact |
|---|---|---|
| Booking has no exact amount, including no legacy amount | `financialDataService.test.js` covers both cases | Booking ID appears in the missing-minor-unit warning; no amount is invented. |
| Owner does not belong to authenticated host | Service/controller tests cover owner-not-found and role rejection | Request is rejected; no cross-host booking data is queried. |
| Invalid reporting window or pagination | Service/controller validation tests | Client receives a validation error. |
| DSQL index build fails or remains invalid | Follow-up migration test checks the intended statements; live DSQL build is not exercised by Jest | Query remains correct but may be slower. PR #4049's runbook checks `sys.jobs` and `pg_index.indisvalid`, and drops an invalid index before retry. |
| Optimizer does not select the new indexes | Cannot be validated with mocked unit tests | PR #4049 requires `EXPLAIN ANALYZE VERBOSE` with representative data and a recorded plan/DPU before broad rollout. |

## Architecture decision: query performance

**Context:** the source-data query selects booking candidates by host and owned property, with a union of stay-overlap and booking-created-in-period conditions.

**Options weighed:**
1. Keep current indexes and wait for production latency to show a problem.
2. Add one broad composite index covering both date branches.
3. Add two targeted indexes sharing the host/property equality prefix: one for `createdat`, another for `arrivaldate` with `departuredate` included.

**Decision:** option 3, implemented separately in #4048. It avoids putting one date branch behind another in a single composite key.

**Consequences accepted:** the indexes add storage and write-maintenance cost. Their performance benefit is not claimed until the real DSQL query plan is checked. The query remains functionally correct without the indexes, but high-volume latency/read cost may be unacceptable.

## Not in scope

- Accounting-period attribution (stay date vs booking date vs transaction date) remains a Finance/Product decision; this endpoint returns source candidates, not statement totals.
- Owner commission agreements, taxes, fees, expenses, FX conversion and payout execution are not calculated here.
- Multiple/partial Stripe refunds still need a dedicated refund ledger; the booking stores one refund reference.
- Historical floating-point totals cannot recover precision already lost. Opt-in scripts remain in dependent PR #4047.
- The existing invoice count-based sequence allocation is pre-existing and its concurrency contract is outside this change.
- Full covering indexes are deferred; the endpoint selects many fields and no measured workload justifies copying the full payload into indexes.
