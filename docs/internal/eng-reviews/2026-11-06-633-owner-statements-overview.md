# feat(owner-statements): add Owner Statements overview and navigation

Pull request: #3798
Issue: #633
Review basis: focused branch diff against `acceptance`
Result: review follow-up implemented; reviewer validation passed; latest documentation-only CI run pending

## Scope

- Adds Owner Statements under the existing Owner Management area.
- Keeps the existing Owners page as the default route.
- Adds a translated Owner Statements landing page with an explicit empty state.
- States that a statement represents an owner balance and does not initiate a payout.
- Adds route and presentation tests.

No financial totals, statements, exports, approvals, or payment allocations are fabricated or implemented in this slice. No database schema or payout workflow is changed.

## Findings and decisions

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 | Financial source data | No Owner Statement persistence model or API was found in the current code. | Kept this change to overview and navigation; statement generation requires a separate data/API implementation. |
| P1 | `docs/internal/tools/dsql_property_owner_runbook.md` | The runbook currently marks the `test` and `main` property-owner schemas as not applied. | Do not deploy code that queries these tables until the database prerequisites are verified and applied. |
| P1 | Issue #633, Statement Generation | The reporting-period attribution rule is still open (booking date, stay date, transaction date, or another configured basis). | Do not calculate or display owner financial amounts until Finance/Product confirms the policy. |
| P2 | Existing Host Finance payout endpoints | These endpoints expose host Stripe charges, balances, and payouts; they are not an owner-statement ledger. | Do not reuse host payout totals as owner earnings or statement settlement. |

## Validation

- Added tests for the nested route, active navigation state, default Owners route, language selection, and unsupported-language fallback.
- Removed the unrelated `HostListings.moderation.test.js` edit; the latest `acceptance` version of that file is retained.
- Updated the host navigation label and its tests against the current `acceptance` menu order. The latest base places Reviews before Owner Management, and the existing POM visibility rule remains covered.
- Added a distinct heading ID for the empty-state section so its `aria-labelledby` points to its own heading.
- Reworded the page description so it does not imply that statement generation is already available.
- Reformatted the four translation files as consistently indented JSON.
- Reviewer validation: 14 test suites and 499 tests passed.
- Node.js CI passed on the implementation head. This follow-up changes only the engineering-review document; its CI run is pending.
- No database changes, migrations, new packages, or payout actions.

## Review follow-up

- The PR branch was rebased onto the current `acceptance` head (`ce716e4fa1e7019320a72a88ebebe54ba68f6d31`) and is no longer behind the base branch.
- Desktop and mobile screenshots were requested but are not attached: the UI could not be launched in this environment. Visual verification and screenshot evidence remain outstanding and must not be treated as completed.

## Next implementation dependencies

1. Confirm the reporting-period and revenue-attribution policy with Finance/Product.
2. Confirm the property-owner database migration and owner API deployment/configuration status.
3. Map validated booking, payment, refund, fee, commission, expense, and payout records to owner/property ownership periods.
4. Add deterministic calculation and immutable statement snapshots before enabling generation or exports.
