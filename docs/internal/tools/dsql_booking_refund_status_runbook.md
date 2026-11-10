# Booking refund status migration (#3834, Part 2)

Add the nullable `refund_status` column to both Aurora DSQL booking schemas before deploying code that reads or writes it.

## Order

1. Apply `20261110_booking_refund_status.sql` to the `test` schema.
2. Confirm the column exists and the migration job completed.
3. Apply the same migration to the `main` schema.
4. Confirm the column exists in both schemas.
5. Deploy the updated Booking entity and booking Lambda only after both schemas are ready.

The migration adds the column idempotently and marks historical cancelled bookings with a payment/refund record as `unknown`. It deliberately does not infer a successful refund from `refunded_amount` or `stripe_refund_id`.

## Verification

Run the metadata query from the migration SQL and confirm one nullable `refund_status` VARCHAR(32) row for each schema.

The migration also reports the number of historical cancelled bookings whose refund outcome is unknown. This is expected for records that predate persisted Stripe refund statuses.

## Status values

- `refunded`: Stripe refund status is `succeeded`.
- `not_refunded`: Stripe refund status is `failed`/ `canceled`, or a paid booking had a zero policy refund.
- `unknown`: refund is pending, could not be verified, or is historical.

## Rollback

Roll back the application code and deploy it before running `20261110_booking_refund_status_rollback.sql`. Dropping the column while the updated Booking entity is deployed will break booking reads.
