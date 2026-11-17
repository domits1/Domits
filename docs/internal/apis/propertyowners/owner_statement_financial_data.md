# Owner Statements: financial source-data preview

Status: **Source-data discovery only. Statement calculations are not enabled.**

## Endpoint

The existing `property-owners` Lambda exposes a read-only GET action:

```
GET {existing property-owners API resource}?action=financial-data&id={ownerId}&period_start_ms={start}&period_end_ms={end}&limit=100&offset=0
```

The caller must be an authenticated `Host` or `Admin`. Every owner, ownership, booking and invoice query is scoped to the authenticated host. The owner ID must belong to that host.

## Query parameters

| Parameter | Required | Meaning |
| --- | --- | --- |
| `action` | Yes | Must be `financial-data`. |
| `id` | Yes | Property-owner UUID. |
| `period_start_ms` | Yes | Inclusive UTC epoch-millisecond boundary. |
| `period_end_ms` | Yes | Exclusive UTC epoch-millisecond boundary; must be later than the start. |
| `limit` | No | Page size, default 100, maximum 500. |
| `offset` | No | Zero-based offset, default 0, maximum 1,000,000. |

The endpoint reads historical ownership assignment periods overlapping the requested window. It returns booking candidates for the owner's assigned properties when either the stay overlaps the requested window or the booking's `createdat` timestamp falls inside it. Both candidate conditions are deliberately returned as a union because Finance/Product have not selected the accounting-period attribution rule.

Booking candidates include raw booking amount and currency fields, booking status and dates, payment reference, and stored refund fields. Linked invoice records are returned as supplemental snapshots. Invoice records are not treated as authoritative owner earnings.

## Response boundaries

The response contains:
- A minimal owner reference.
- Ownership shares and their effective periods.
- A paginated list of booking candidates.
- Linked invoice snapshots for the returned bookings.
- Explicit data-quality warnings.

The response intentionally contains **no calculated owner earnings, payout amount, commission total, tax total, or statement status**. Pagination is based on booking candidates; the endpoint does not promise a transactional snapshot while the underlying source records are changing.

## Known source-data limitations

1. The booking-versus-stay-versus-transaction period rule has not been approved.
2. Stripe charge, balance-transaction, refund and bank-payout details are not fetched by this endpoint. A booking's payment ID is only a reference.
3. The booking table stores a refund summary, not a complete refund transaction ledger.
4. There is no persisted property-expense ledger in the current model.
5. Invoice records have no currency field. The current invoice-creation flow applies a fixed 10% commission, so invoice values must not be used as the owner commission policy.
6. Channex imports currently do not persist the source booking currency.
7. Tax treatment, fee responsibility, share changes during a stay and rounding rules require Finance/Product decisions.
8. The property-owner tables are applied manually; verify both `test` and `main` schema readiness using the DSQL runbook before deploying a runtime that queries them.

## Next phase

After Finance/Product decisions and source-data remediation, implement a deterministic calculation service and immutable statement snapshots. Do not enable generation from this preview endpoint.
