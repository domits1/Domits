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

Booking candidates include the legacy major-unit booking amount, the exact integer minor-unit snapshot when available, currency, booking status and dates, payment reference, and both requested and recorded refund fields. Linked invoice records are returned as supplemental snapshots with currency and minor-unit snapshots when present. Invoice records are not treated as authoritative owner earnings.

An empty booking currency is resolved using the legacy import contract: native Domits and standalone-site bookings with a stored price are treated as EUR. Channex bookings use their stored ISO currency when present; older Channex rows with a non-null amount and no currency retain the historical EUR fallback because the earlier importer only persisted EUR amounts. A Channex booking with neither a stored currency nor a stored amount remains unknown and is reported in the missing-currency warning arrays. The endpoint also reports bookings whose legacy major-unit amount exists but exact minor units have not yet been backfilled.

## Response boundaries

The response contains:
- A minimal owner reference.
- Ownership shares and their effective periods.
- A paginated list of booking candidates.
- Linked invoice snapshots for the returned bookings.
- Explicit data-quality warnings.

The response intentionally contains **no calculated owner earnings, payout amount, commission total, tax total, or statement status**. Pagination is based on booking candidates; the endpoint does not promise a transactional snapshot while the underlying source records are changing.

### Raw amount representations

Amount fields are returned as raw source values rather than statement totals. `total_price` remains the compatibility major-unit field; `total_price_minor` is the exact integer minor-unit snapshot with its `currency`. For new cancellation attempts, `refund_requested_amount` is the policy-derived request and `refunded_amount` is written only from a confirmed Stripe refund response. Legacy refund values are not automatically reclassified. Invoice compatibility fields remain PostgreSQL `numeric(10,2)`; new invoice records additionally store currency and integer minor-unit snapshots for nightly rate, gross, commission and net amounts.

## Known source-data limitations

1. The booking-versus-stay-versus-transaction period rule has not been approved.
2. Stripe charge, balance-transaction, refund and bank-payout details are not fetched by this endpoint. A booking's payment ID is only a reference.
3. The booking table stores a refund summary, not a complete refund transaction ledger.
4. There is no persisted property-expense ledger in the current model.
5. New invoice records store currency and exact minor-unit snapshots; historical invoices remain without a currency/minor-unit snapshot until reconciled. Invoice creation currently refuses currencies with more than two fraction digits because the compatibility `NUMERIC(10,2)` amount columns cannot represent a third fractional digit. The invoice generator's fixed 10% calculation is an invoice convention, not the owner-agreement commission source.
6. New Channex imports persist the source currency and exact minor units. Older Channex rows with a stored amount but no currency retain the EUR fallback from the historical import contract; rows with no amount and no currency remain unresolved and are skipped by the legacy backfill.
7. Historical `refunded_amount` values may contain the old policy-calculated amount even when Stripe did not confirm a refund. Do not treat legacy values as confirmed refunds without reconciliation.
8. Tax treatment, fee responsibility, share changes during a stay and rounding rules require Finance/Product decisions.
9. The property-owner and money-precision schema changes are applied manually; verify readiness using the DSQL runbooks before deploying a runtime that queries them.

## Next phase

After Finance/Product decisions and source-data remediation, implement a deterministic calculation service and immutable statement snapshots. Do not enable generation from this preview endpoint.
