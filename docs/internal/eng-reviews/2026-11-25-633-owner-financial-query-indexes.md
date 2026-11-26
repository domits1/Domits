# Owner Statements booking query indexes

Pull request: #4048  
Issue: #633  
Related feature: #4036  
Reviewed commit: pending first implementation commit  
Result: targeted query indexes added; live query-plan validation is a deployment gate.

## Review passes

- **Architecture:** reuses the existing Booking table and query; no new runtime service or accounting model.
- **Code quality:** one migration record, one SQL deployment file, one rollback file and a focused runbook.
- **Tests:** verifies the exact DDL for both schemas and that rollback removes only these indexes.
- **Performance:** two indexes target the query's date branches; the query plan must be checked with representative DSQL data.

## Evidence

The query filters by host and property, then applies a stay-overlap or creation-time predicate:

~~~js
.where("booking.hostid = :hostId", { hostId })
.andWhere("booking.property_id IN (:...propertyIds)", { propertyIds })
.andWhere(
  "((booking.arrivaldate < :periodEndMs AND booking.departuredate > :periodStartMs) OR (booking.createdat >= :periodStartMs AND booking.createdat < :periodEndMs))",
  { periodStartMs, periodEndMs }
)
~~~

## What already exists

- The Booking table already stores host, property, arrival, departure and creation-time columns.
- The query is host-scoped and property-scoped by the Owner Statements service.
- Existing booking uniqueness indexes remain unchanged.

## Data flow

~~~text
Owner financial-data request
       |
       v
host + property scope
       |
       +--> createdat window --> created-time composite index
       |
       +--> arrival/departure overlap --> stay-overlap composite index
       |
       v
bounded page ordered by createdat, id
~~~

## Failure modes

| Failure | Test coverage | Handling and user impact |
|---|---|---|
| DSQL rejects or fails an asynchronous index build | Unit test checks intended DDL, not live DSQL | Runbook checks `sys.jobs` and `pg_index.indisvalid`; failed indexes are dropped before retry. Query correctness is unchanged, but performance benefit is absent. |
| Optimizer does not use indexes for the OR predicate | Requires live representative data; not covered by Jest | Runbook requires EXPLAIN ANALYZE and DPU evidence. The endpoint remains correct, but can still be slow. |
| New indexes increase write/storage cost | No functional test needed | Two extra indexes per schema are accepted for this targeted financial read path; monitor write/read cost after rollout. |

## Architecture decision

**Context:** the Owner Statements query shares equality filters (`hostid`, `property_id`) but has two distinct date predicates.

**Options:** keep current indexes; create one broad index; or add two targeted indexes.

**Decision:** two indexes with the common host/property prefix, one for creation time and one for stay overlap. `departuredate` is an included column on the stay index.

**Consequences:** four asynchronous builds (two per schema), plus storage and write amplification. This is a reasoned index design, not a measured performance claim; production rollout requires a recorded EXPLAIN plan on representative data.

## Not in scope

- Rewriting the booking query or changing its source-data candidate semantics.
- Accounting-period attribution, statement totals, fees, taxes, expenses or payouts.
- Covering all selected booking columns in the indexes; that would duplicate a wide row without measured justification.
