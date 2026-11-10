# Cancelled booking refund status (#3834, Part 2)

## Decision

Persist a separate `refund_status` on the booking and expose it only for cancelled reservations. The values are:

- `refunded`: Stripe returned `succeeded`.
- `not_refunded`: Stripe returned `failed` or `canceled`, or a paid booking's cancellation policy calculates a zero refund.
- `unknown`: Stripe returned a non-terminal state, the Stripe lookup failed, or a legacy cancelled payment has no verifiable outcome.

A refund ID alone is not proof that money was returned. Pending refunds must remain unknown until their state can be verified.

## Existing behavior reused

The guest cancellation controller already calculates the policy amount, creates the Stripe refund, and stores `refunded_amount`, `stripe_refund_id` and `refund_error`. The host bookings read already returns the booking fields. The reservation page already passes its reservation model into the receipt builder and PDF generator.

## Data flow

```
Guest cancellation
       |
       v
Cancellation policy -> Stripe refund create/retrieve
       |                         |
       |                         v
       |                  succeeded / failed /
       |                  canceled / pending
       v                         |
Booking.refund_status <----------+
       |
       +---- host reservation page
       |
       +---- receipt PDF
```

## Failure handling

- Stripe succeeds: persist `refunded`.
- Stripe fails or is canceled: persist `not_refunded`.
- Stripe returns pending or an unrecognized state: persist `unknown`.
- Stripe API lookup/create throws: persist `unknown` and retain the existing `refund_error`.
- Existing refund ID without a stored status: retrieve it from Stripe; on lookup failure keep it unknown.
- Legacy cancelled rows with payment/refund evidence are backfilled to `unknown`; no amount is inferred as refunded solely from the historical amount field.

## Tests

Backend tests cover succeeded, failed, pending, missing PaymentIntent, Stripe API failure, existing refund retrieval and zero-refund policy. ORM tests verify the nullable entity field and migration. Frontend tests cover all three labels on the page and receipt, plus no label when there is no payment evidence.

## Not in scope

- Reworking cancellation policy calculations or Stripe refund amounts.
- Host-initiated cancellation or OTA-managed refunds.
- The broader CRS refund lifecycle in #2655.
- Automatically refreshing a pending refund after Stripe later transitions it; pending stays unknown until a status refresh path is available.
