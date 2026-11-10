# Booking refund status migration (#3834, Part 2)

Add the nullable `refund_status` column to both Aurora DSQL booking schemas before deploying code that reads or writes it.

## Apply

Run `20261110_booking_refund_status.sql` once against the Aurora DSQL cluster. The script contains schema-qualified statements and applies the change in this order:

1. Add the column to `test.booking`.
2. Add the column to `main.booking`.
3. Mark historical cancelled bookings with payment/refund evidence as `unknown`.

Do not run the complete script separately for each schema; it already contains statements for both.

Deploy the updated Booking entity and booking Lambda only after the migration completes successfully.

## Verify

Run the metadata query in the migration SQL and confirm one nullable `refund_status` VARCHAR(32) row for each schema. Check that no migration job remains submitted or processing.

The migration reports the number of historical cancelled bookings whose refund outcome is unknown. This is expected for records that predate persisted Stripe refund statuses. The migration deliberately does not infer a successful refund from `refunded_amount` or `stripe_refund_id`.

## Status values

- `refunded`: Stripe refund status is `succeeded`.
- `not_refunded`: Stripe refund status is `failed`/`canceled`, or a paid booking had a zero policy refund.
- `unknown`: refund is pending, could not be verified, or is historical.

## Rollback

Roll back the application code and deploy it before running `20261110_booking_refund_status_rollback.sql`. Dropping the column while the updated Booking entity is deployed will break booking reads.
