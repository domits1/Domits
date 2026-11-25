# Owner Statements: financial calculation primitives

Related feature: [#633](https://github.com/domits1/Domits/issues/633)
Source-data dependency: [PR #3934](https://github.com/domits1/Domits/pull/3934)
Policy proposal: [PR #3997](https://github.com/domits1/Domits/pull/3997)

## Scope

This change adds pure, deterministic money and ownership-allocation primitives to the property-owner domain. It is intentionally not connected to the financial-data endpoint or statement generation.

The helpers provide:
- Decimal-string or finite-number conversion into integer minor units using an explicitly supplied currency precision and rounding mode.
- Basis-point amount calculation using an explicitly supplied rounding mode.
- Multi-owner allocation that requires ownership shares to total exactly 10000 basis points and an explicitly supplied largest-remainder allocation policy.

## Calculation contract

All helper outputs that represent minor currency units use BigInt, including each allocation's amountMinorUnits. Keeping one type throughout the calculation helpers avoids mixing numeric representations and preserves integer precision.

BigInt is not supported by JSON.stringify. Callers must convert minor-unit values to base-10 strings at the JSON/API serialization boundary, rather than changing the calculation helpers' return types.

The half-up rounding mode means half away from zero. For example, with two fraction digits, 10.005 becomes 10.01 and -10.005 becomes -10.01. This is distinct from JavaScript's Math.round behavior for negative halfway values.

## Safety boundaries

- No default currency, currency precision, rounding mode, commission percentage, booking eligibility status, reporting-period attribution, refund timing, tax treatment, or expense responsibility is introduced.
- No invoice amount is used as an owner commission rule. The invoice creation path currently uses a fixed 10% commission and is not an owner-agreement source.
- Unknown currencies and missing source amounts remain unresolved; these helpers do not convert between currencies.
- Raw booking totals, refund cents, and invoice decimal strings remain unchanged in the source-data endpoint.
- No Stripe payment, refund, payout, or transfer is requested or modified.
- Largest-remainder allocation is available only when the caller explicitly selects it. Its owner-ID tie-break makes allocation reproducible.

## Tests

Added unit coverage for decimal conversion, scientific notation, negative amounts, rounding modes, basis-point calculations, ownership-share validation, remainder distribution, and deterministic ties.

Executed locally from the backend directory:

~~~bash
npm test -- --runInBand test/property-owners/ownerStatementCalculations.test.js
~~~

Result: **34 tests passed**.

## Remaining policy decisions

Finance/Product still needs to approve the accounting decisions recorded in the policy proposal before these primitives are wired into statement totals: revenue attribution, eligible booking statuses, refund/chargeback treatment, commission source and precedence, expense allocation, tax treatment, ownership effective-date handling, currency conversion, and rounding policy.

This PR does not claim the Owner Statements calculation policy is approved and does not enable statement generation.
