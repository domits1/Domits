# Engineering review: Owner Statements financial source-data preview (#633)

Date: 2026-11-17  
Pull request: [#3934](https://github.com/domits1/Domits/pull/3934)  
Reviewed head: `44e827601148b7d653899b17711a6709e436bd2a`  
Review status: one confirmed finding is awaiting a decision; do not treat this review as merge approval.

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

### [P2] (confidence: 9/10) Currency nulls are treated as missing even when the documented meaning is EUR

**Evidence**

- `backend/functions/property-owners/business/service/service.js:145` filters all bookings with a falsy `currency` into `missingCurrencyBookingIds`.
- `backend/functions/property-owners/business/service/service.js:148` also reports Channex bookings with a falsy currency.
- `backend/functions/property-owners/business/service/service.js:188` returns `booking.currency || null`, so a legacy/direct Domits booking with no stored currency is sent to consumers as unknown.
- `backend/ORM/models/Booking.js:158-159` says: `// Empty means euros: every booking from before this column, and every Domits booking.`
- `docs/internal/tools/dsql_booking_currency_runbook.md:8` states that the column stores a currency for channel bookings in another currency and that an empty value means euros. Lines 26 and the #3582 backfill note distinguish legacy EUR bookings from imported-channel currency handling.
- `backend/functions/.shared/channelManagement/repositories/channexExternalBookingImportRepository.js:145-150` currently sets `bookingtype: "channex"` and `total_price`, but does not set `currency`. Therefore a Channex record with an empty field is a real unknown until the currency-import work is complete, unlike a legacy/direct Domits booking.

**Impact**

The preview incorrectly labels normal EUR bookings as missing currency and returns `currency: null` for them. This produces misleading data-quality warnings and makes the source-data contract ambiguous for the next calculation phase.

**Options**

A. Normalize an empty currency to `EUR` for legacy/direct Domits bookings; preserve `null` and a warning only for Channex records whose source currency is not stored yet. Add tests for both cases.  
B. Keep `null` for every empty currency and remove the “missing” interpretation from the preview, leaving consumers to infer the documented default themselves.

**Recommendation: A.** It follows the existing Booking model and DSQL runbook semantics, while retaining an explicit warning for the currently incomplete Channex import path.

**Decision: pending maintainer approval.** No code change for this finding is included in this review record.

## Failure modes

| Failure mode | Test coverage | Handling / visible result | Assessment |
|---|---|---|---|
| Caller is not Host/Admin or token is invalid | Controller role/auth tests cover the new operation | Existing controller returns 401/403 and does not call the service | Covered |
| Owner ID does not belong to the authenticated host | Service test covers missing/foreign owner | Returns 404 without querying ownership or booking data | Covered |
| Invalid period, UUID or pagination | Validator tests cover malformed and out-of-range values | Returns 400 | Covered |
| Owner has no ownership periods in the window | Service test covers empty assignments | Returns an empty page and skips booking/invoice queries | Covered |
| Database tables are absent or query fails | No live database integration test for this endpoint | Controller returns generic 500; the DSQL runbook currently says the owner tables are not applied in test/main | Deployment blocker: verify/apply through the runbook before enabling |
| Currency is empty | Current tests assert the empty value is reported, but do not distinguish documented EUR defaults from unknown Channex currency | Current response gives false missing-currency warnings for legacy/direct bookings | Finding above |
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

On the reviewed head before this review document was added:
- `CI - Test Lambda Functions`: passed, including backend Jest and AWS Lambda validation.
- `Node.js CI`: frontend Jest passed; the frontend release build was still running at the last check.
- SonarCloud Quality Gate: passed, 0 new issues.

The currency finding above requires a decision and a focused test update. Any resulting code change must be followed by fresh CI and SonarCloud checks.
