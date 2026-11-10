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

## Post-deployment verification (test environment)

Complete these checks in the test environment after the schema migration and Lambda deployment, before promoting the change to production:

1. Confirm the booking Lambda is running with `STRIPE_MODE=test` and that the existing `/stripe/keys/secret/test` parameter resolves to the test-mode platform secret. Use a host with a connected Stripe test account.
2. Submit and accept a new Standalone Site booking with a known quote breakdown. Confirm the booking stores `commissionable_accommodation_cents` from the revalidated accommodation subtotal, not the guest total.
3. Complete the test payment. Confirm Stripe's PaymentIntent amount equals the guest quote total, its destination is the host's connected account, and its application fee equals the rounded tier percentage multiplied by the accommodation-only amount.
4. Confirm the booking stores the applied commission rate, amount, annual revenue snapshot and commission year. Confirm the booking is counted in the following tier calculation only after its status becomes `Paid`.
5. Run a partial and a full refund in test mode. Verify the guest refund, connected-account transfer reversal and proportional application-fee refund in Stripe.
6. Create a normal marketplace booking and verify it still follows the pre-existing payment calculation.

Do not use live Stripe keys or real guest payments for this verification. The production rollout requires the same schema smoke checks on `main.booking`, successful CI, and an approved test-environment result.

## Operating assumptions to confirm with Product/Finance

- Annual volume is grouped by the UTC year of booking creation, while only bookings in `Paid` status contribute to the revenue sum.
- Historical bookings with no stored accommodation-only cents remain excluded from new-tier aggregation. Do not substitute `total_price`, because it can contain cleaning, taxes or other non-commissionable amounts.
- At €5,000,000 and above the current implementation blocks acceptance until an Enterprise commission rate is supplied. Confirm the intended rate/configuration path before a host reaches that volume.
