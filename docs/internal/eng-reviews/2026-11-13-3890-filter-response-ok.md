# fix(filter): throw on non-2xx from properties API instead of caching a truncated catalog #3890

Pull request: not opened yet
Issue: #3890
Reviewed commit: 974bb3300
Result: 1 finding, not fixed here (non-blocking, tracked as #3898)

## The fix

`fetchProperties` in `backend/functions/General-Accommodation-FilterFunction/data/propertyRepository.mjs` now checks `response.ok` before parsing the body. A non-2xx throws an error with the upstream status in the message, and the catch block rethrows with the original error as `cause`. An error body has no `properties` or `lastEvaluatedKey`, so it used to look like an empty last page and ended the catalog walk early. `fetchAllProperties` now never caches a partial result.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `frontend/web/src/pages/home/FilterLogic.jsx:142-157` | `FilterLogic.jsx` does not check `response.ok` on this same endpoint (`const response = await fetch(url); const data = await response.json();`). On a server error the error body has no `properties`, so `properties` becomes `[]` and line 157 runs `setError("No accommodations found for these criteria")`. The user sees a misleading empty result instead of a real error. The price-bounds fetch at `:39` also skips the check, but it falls back to client-side bounds, so it is a smaller concern. | Not fixed here. Tracked as #3898. |

## Not in scope

- Negative caching and a stale-while-error design. A failed walk is simply not cached, so the next call walks again.
- A fetch timeout. None exists today, and this diff does not change that.
- Non-JSON 2xx bodies. Behavior is unchanged.
- The frontend finding above, tracked as #3898.

## Verification

- 4 new tests in `backend/test/General-Accommodation-FilterFunction/propertyRepository.cache.test.js`:
  - a non-2xx throws;
  - a 400 mid-walk throws instead of returning a partial list;
  - a failed walk is never cached (the next call walks again and succeeds);
  - the thrown error logs with the upstream status in its cause.
- Mutation check: 7 mutants, all killed.
  - removing the `response.ok` check;
  - a 5xx-only check;
  - dropping `cause`;
  - swallowing the error;
  - dropping the cursor id;
  - caching a partial result;
  - removing the log.
- Full backend suite: matches the measured baseline exactly (14 pre-existing failing suites, 20 failing tests, all unrelated to this change).
