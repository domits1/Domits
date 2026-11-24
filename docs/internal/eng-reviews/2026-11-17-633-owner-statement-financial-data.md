# Engineering review: Owner Statements financial source-data preview (#633)

Date: 2026-11-17  
Pull request: [#3934](https://github.com/domits1/Domits/pull/3934)  
Review target: current PR head after the currency-normalization update.  
Review status: currency finding addressed in code; live database verification remains outstanding.

## What already exists

- `property-owners` already authenticates Host/Admin callers and scopes owner reads by both owner ID and authenticated host ID.
- `property_owner_property` stores effective-dated ownership shares. The period check enforces `effective_to IS NULL OR effective_to > effective_from`, so closed periods use an exclusive end boundary.
- `Booking` stores stay dates, creation time, raw booking total, currency, payment reference and refund summary fields.
- `Invoice` stores supplemental gross, commission and net snapshots, but has no currency column.
- Existing invoice creation currently applies a fixed 10% commission. That is not a source of truth for legal owner agreements and is not reused for calculations here.
- The Stripe host payout flow is not an owner-level ledger. This PR correctly avoids treating host payouts as owner earnings.

## Architecture and data flow

This PR adds a read-only discovery path to the existing property-owners Lambda. It does not create a second finance service or write to payment systems.

```
Host/Admin
   |
   v
GET action=financial-data
   |
   v
Authorize role + validate owner/window/page
   |
   v
Owner lookup (owner ID + authenticated host ID)
   |
   v
Historical ownership periods overlapping [start, end)
   |
   v
Distinct property IDs
   |
   v
Paginated bookings scoped by host + property
   |  stay overlaps window OR booking created in window
   v
Invoice snapshots scoped by host + returned booking IDs
   |
   v
Source-data preview + explicit limitations
   |
   v
No financial totals / no payment writes
```

The candidate booking predicate is deliberately a union of stay-overlap and booking-created-in-window. That is a discovery set only; the code does not claim to select the final accounting date.

## Findings

### [P2 — addressed] Currency nulls are treated as missing even when the documented meaning is EUR

**Evidence**

- `backend/functions/property-owners/business/service/service.js:145` filters all bookings with a falsy `currency` into `missingCurrencyBookingIds`.
- `backend/functions/property-owners/business/service/service.js:148` also reports Channex bookings with a falsy currency.
- `backend/functions/property-owners/business/service/service.js:188` returns `booking.currency || null`, so a legacy/direct Domits booking with no stored currency is sent to consumers as unknown.
- `backend/ORM/models/Booking.js:158-159` says: `// Empty means euros: every booking from before this column, and every Domits booking.`
- `docs/internal/tools/dsql_booking_currency_runbook.md:8` states that the column stores a currency for channel bookings in another currency and that an empty value means euros. Lines 26 and the #3582 backfill note distinguish legacy EUR bookings from imported-channel currency handling.
- `backend/functions/.shared/channelManagement/repositories/channexExternalBookingImportRepository.js` sets `bookingtype: "channex"` and `total_price`, but does not set `currency`. The upstream `toEuroAmountOrNull()` helper only passes through a total for `EUR` revisions; foreign-currency, missing or unreadable amounts become `null`. Therefore a non-null Channex `total_price` is evidence that the stored amount is EUR, while a null price plus empty currency remains unknown.

**Impact**

The preview incorrectly labels empty-currency Domits bookings and Channex bookings with an already-stored EUR total as missing. This produces misleading warnings and returns `currency: null` even though the stored Channex amount can only have come from an EUR revision.

**Options**

A. Normalize an empty currency to `EUR` for legacy/direct Domits bookings and Channex bookings with a non-null stored `total_price`; preserve `null` and a warning for Channex records whose total price is null. Add tests for both cases.  
B. Keep `null` for every empty currency and remove the “missing” interpretation from the preview, leaving consumers to infer the documented default themselves.

**Recommendation: A.** It follows the Booking model and Channex import contract, while retaining an explicit warning only when Channex has not stored a EUR total.

**Decision: Option A, confirmed by Rakib in the PR review on 2026-11-17.** The service now returns `EUR` for empty non-Channex booking currencies and for Channex bookings with a non-null `total_price` (the importer only stores Channex totals for EUR revisions). A Channex booking with no stored price remains `null` and is reported as missing. Regression coverage includes direct bookings, Channex EUR prices, zero-priced Channex bookings and Channex bookings with no stored price.

## Failure modes

| Failure mode | Test coverage | Handling / visible result | Assessment |
|---|---|---|---|
| Caller is not Host/Admin or token is invalid | Controller role/auth tests cover the new operation | Existing controller returns 401/403 and does not call the service | Covered |
| Owner ID does not belong to the authenticated host | Service test covers missing/foreign owner | Returns 404 without querying ownership or booking data | Covered |
| Invalid period, UUID or pagination | Validator tests cover malformed and out-of-range values | Returns 400 | Covered |
| Owner has no ownership periods in the window | Service test covers empty assignments | Returns an empty page and skips booking/invoice queries | Covered |
| Database tables are absent or query fails | No live database integration test for this endpoint | Controller returns generic 500; the DSQL runbook currently says the owner tables are not applied in test/main | Deployment blocker: verify/apply through the runbook before enabling |
| Currency is empty | Service regression test verifies empty non-Channex values resolve to EUR and empty Channex values remain null with warnings | Only unresolved Channex values are reported as missing | Covered |
| Booking/ownership data changes between separate reads or between offset pages | No concurrent-mutation test | Endpoint is read-only and documents that it is not a transactional snapshot | Acceptable for discovery preview; immutable statement generation must use a consistent snapshot |

## Performance and access patterns

- The service performs one owner lookup, one ownership-period query, one paginated booking query and one invoice lookup for the returned booking IDs. It does not issue an N+1 query per booking.
- Booking rows are scoped by `hostid` and selected property IDs before date filtering.
- Booking pagination is bounded to a maximum of 500 rows and fetches one extra row to determine `hasMore`.
- Historical ownership periods are not paginated. This is a bounded lookup for one owner, but should be revisited if the product later permits very frequent ownership changes over long histories.
- Invoice snapshots are fetched only for the current booking page and scoped by host and booking IDs.

## Not in scope

- Choosing booking date, stay date or transaction date as the reporting basis: Finance/Product must decide this.
- Calculating commission, taxes, expenses, owner earnings, payable balances or payout reconciliation: the source data and commercial rules are not complete.
- Fetching Stripe balance transactions and bank payouts: a booking payment ID is only a reference in this preview.
- Building a refund transaction ledger: the booking model currently exposes a summary.
- Applying the hand-run owner database migration: it must follow the DSQL runbook and be verified by the database operator.
- Generating, approving, publishing or exporting statements: those belong in later phases after the calculation policy is agreed.

## Verification

On the reviewed head before the currency-normalization update:
- `CI - Test Lambda Functions`: passed, including backend Jest and AWS Lambda validation.
- `Node.js CI`: frontend Jest passed; the frontend release build was still running at the last check.
- SonarCloud Quality Gate: passed, 0 new issues.

The currency change and regression test are now included in the current PR branch; fresh CI and SonarCloud checks must complete on that head.

The response continues to expose raw amounts without coercion. `refunded_amount` is cents, booking `total_price` is euros, and invoice `numeric(10,2)` fields are decimal strings. The service test now uses string fixtures for the bigint and numeric values to protect that API behavior. Normalizing these belongs in the calculation service, where unit conversions and precision requirements can be handled explicitly; coercing them in this discovery endpoint would hide important source semantics.

The ORM wiring was inspected:
- The backend `database` package is used by this Lambda and its root `Tables.js` registry includes `Booking`, `Invoice`, `Property_Owner` and `Property_Owner_Property`.
- Every field selected by the financial-data repository exists in the corresponding `Booking` and `Invoice` EntitySchema definitions.

The live database check remains blocked:
- `docs/internal/tools/dsql_property_owner_runbook.md` records the `test` and `main` owner-table schemas as **Not applied**.
- No authenticated Aurora DSQL session is available in this review workspace, so no real endpoint call or schema query was performed.
- Apply and verify the owner-table migration in both schemas using the runbook before making a live request or deploying code that queries those tables.
