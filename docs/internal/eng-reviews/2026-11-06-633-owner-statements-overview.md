# feat(owner-statements): add Owner Statements overview and navigation

Pull request: #3798
Issue: #633
Review basis: focused branch diff against `acceptance`
Result: no blocking findings identified in this navigation-only slice

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
- Initial CI run exposed a stale Owner Management navigation assertion and a pre-existing `HostListings` mock that exported `fetchVerificationStatus` instead of `fetchLiveEligibility`.
- Updated both test fixtures; the frontend CI workflow must be rerun before merge.
- Tests were not run locally through this GitHub-only change path.
- No database changes, migrations, new packages, or payout actions.

## Next implementation dependencies

1. Confirm the reporting-period and revenue-attribution policy with Finance/Product.
2. Confirm the property-owner database migration and owner API deployment/configuration status.
3. Map validated booking, payment, refund, fee, commission, expense, and payout records to owner/property ownership periods.
4. Add deterministic calculation and immutable statement snapshots before enabling generation or exports.
