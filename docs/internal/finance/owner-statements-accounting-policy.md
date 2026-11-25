# Owner Statements — Accounting Policy Draft

Related feature: [#633](https://github.com/domits1/Domits/issues/633)  
Related foundation: [PR #3934](https://github.com/domits1/Domits/pull/3934)

## Purpose

Define the accounting rules that must be agreed before implementing owner-statement calculations. This document is a proposal for product and finance review, not an approved accounting policy.

The financial-data endpoint in PR #3934 is a read-only source-data preview. It does not calculate earnings, reconcile Stripe transactions, create statements, or initiate payouts.

## Principles

- Keep owner earnings, statement balances, and actual cash payouts distinct.
- Every calculated amount must be traceable to its source record and rule.
- Use deterministic calculations with decimal-safe arithmetic and explicit currency precision.
- Preserve the inputs and rule version used for each finalized statement.
- Do not silently change approved or published statements when source data changes.
- Do not execute transfers as part of statement generation, approval, or publication.
- Do not treat missing financial data as zero.

## Proposed MVP policy (requires approval)

| Topic | Proposed MVP rule | Decision needed |
| --- | --- | --- |
| Reporting period | Attribute rental income to the stay/check-out period, with a documented split for stays spanning periods | Finance/product to confirm whether stay date, booking date, or transaction date is the official basis |
| Eligible reservations | Include only reservations meeting an agreed completed/eligible status rule | Confirm treatment of cancelled, no-show, modified, and disputed reservations |
| Gross rental revenue | Use the validated rental component, excluding taxes and pass-through charges unless explicitly classified as owner income | Confirm booking fields and included components |
| Refunds | Record refunds as separate negative adjustments linked to the original reservation and period policy | Confirm whether refund follows original stay period or refund transaction date |
| Domits commission | Apply the configured owner/property agreement; do not assume a universal percentage | Confirm source of commission configuration and precedence |
| Channel/payment fees | Deduct only when source transaction and responsibility are known | Confirm whether these are owner- or manager-borne |
| Property expenses | Deduct only from a persisted, approved expense record with an owner/property allocation | Expense ledger and allocation rules are a dependency; do not invent expenses |
| Taxes | Keep tax components separate from rental income and deductions | Tax classification and market-specific treatment require finance review |
| Ownership share | Apply the ownership assignment effective for the relevant period; split where an ownership change overlaps a stay/period | Confirm effective-date semantics and split method |
| Currency | Calculate and report in the source currency; do not convert without a defined FX source, timestamp, and rate policy | Confirm supported currencies and conversion requirements |
| Rounding | Use decimal-safe calculations; round at the documented line-item or statement-total boundary | Finance to approve precision and rounding method |
| Prior balance | Show opening balance, payments, and closing outstanding separately from current-period earnings | Confirm whether carry-forward is in MVP |
| Payment status | Derive from recorded payment allocations, not a manually entered status | Payment ledger/reconciliation integration is required |

## Source-data readiness and known gaps

The current financial-data foundation does not yet provide a complete accounting ledger:

- Stripe charge, balance transaction, and payout records are not included; a booking payment ID is only a reference.
- Booking refund data is a summary, not a full refund transaction ledger.
- A persisted property-expense ledger is not available in the foundation.
- Invoice records are supplemental: they lack currency and the current invoice path uses a fixed 10% commission.
- Channex imports do not consistently persist source currency; unknown amounts must remain flagged rather than treated as EUR or zero.

These gaps must be closed or explicitly excluded from MVP calculations before statements can be considered financially complete.

## Recommended calculation model

Keep the implementation separated into these layers:

1. **Validated source records** — bookings, ownership periods, approved expenses, commission rules, refunds, and transaction/payment records.
2. **Calculation service** — deterministic, read-only calculation of income, deductions, owner share, and balance.
3. **Statement snapshot** — persisted version of source references, rule versions, currency, line items, totals, and warnings.
4. **Settlement/reconciliation** — separately matches recorded payments to statement balances.

A statement should not be marked paid solely because a calculated amount exists.

## Required approval before calculation implementation

Product/finance should confirm:

- Revenue attribution basis and period cutoff.
- Reservation eligibility and cancellation/no-show treatment.
- Refund and chargeback timing.
- Commission configuration and precedence.
- Expense responsibility and allocation.
- Tax treatment.
- Ownership effective-date and split behavior.
- Currency conversion policy, if any.
- Precision and rounding.
- Whether opening balances and carry-forward are in MVP.

## Acceptance criteria for this policy step

- [ ] Product/finance review the proposed rules and mark each decision approved or revise it.
- [ ] Each approved rule identifies its source data and owner.
- [ ] Missing source data is documented with an implementation dependency.
- [ ] No calculation code assumes unresolved policy decisions.
- [ ] The approved policy is used as the basis for calculation-service tests and implementation.

## Out of scope

This PR does not implement calculations, statement generation, PDF/CSV export, approval workflows, payment reconciliation, or payouts. Those depend on approved accounting rules and complete source data.
