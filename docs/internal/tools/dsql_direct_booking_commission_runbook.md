# Direct Booking commission fields (2026-11-10)

This migration adds the quote base and applied annual commission details to `main.booking` and `test.booking`.

## Before deployment

`Booking.js` maps all five columns. TypeORM selects every mapped Booking column, so the migration must be applied to both schemas before deploying this code.

Connect to Aurora DSQL as Admin. Run the statements in `backend/ORM/migrations/20261110_direct_booking_commission.sql` one at a time, without a transaction.

1. The first column query should return no rows before applying the migration.
2. Check `sys.jobs` for active schema jobs.
3. Apply the five `ALTER TABLE test.booking` statements, then the five `ALTER TABLE main.booking` statements.
4. Verify that ten nullable columns are present across the two schemas with the expected types.
5. Run the two `SELECT` smoke reads to confirm both tables can project the new fields.
6. Deploy the application after both schemas are ready.

Existing rows remain `NULL` for the commission fields. Old Standalone Site booking requests that do not have a stored accommodation-only quote base retain the previous payment calculation; new requests store the base from the server-revalidated quote.

## Pricing behavior

The backend applies the applicable tier when an accepted Standalone Site request is converted into a Stripe PaymentIntent. It uses paid Standalone Site accommodation revenue created in the current UTC calendar year plus the current booking's accommodation amount. The entire current booking uses the tier reached by including that booking.

The guest pays the confirmed quote total. Domits' application fee is deducted from the host transfer, using the percentage on the accommodation amount only. Cleaning and other amounts outside `nightlyBaseTotal` are excluded from the commission base.

At or above €5,000,000 annual revenue, the configured table marks the account as Enterprise. Payment creation fails with an explicit Enterprise-rate-required response rather than silently applying a percentage that is not in the published tiers.

## Rollback

Revert the code and entity mapping first and deploy it. Only then consider dropping the five columns, because removing them while a Lambda still has the new Booking entity will break Booking reads. The columns are nullable and harmless to leave unused.
