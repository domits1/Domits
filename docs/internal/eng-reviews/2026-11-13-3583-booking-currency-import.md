# feat(channex): store and show the currency of imported bookings

Pull request: #3915 (stacked on #3900)
Issue: #3583 (sub-issue of #3579); second of two pull requests, after the column in #3900
Reviewed commit: staged diff per commit on `feat/3583-booking-currency-import`
Result: no open blocking findings; two P2s were fixed before their commit (commit 3, ambiguous "$"; commit 5, revenue efficiency), two P2s of commit 1 closed by commit 2; Puok's review point on the PriceLabs push fixed in commit 8

```
Channex revision { amount, currency }
        ▼  toBookingAmount
{ totalPrice, currency }   both set, or both null (no amount, or no valid ISO code)
        ▼  create / update repository
booking.total_price + booking.currency
        ▼
list / details / receipt              PriceLabs + missed revenue skip non-EUR (decision A)
```

## Exit criteria for merging

- The repository writes `currency` on create and on update (commit 2).
- The reservation list, details page and receipt show the stored currency (commits 3 and 4).
- The missed-revenue total leaves non-euro bookings out (commit 5); the PriceLabs push sends them with amount 0 (commit 8, replacing the filter of commit 6).
- #3900 is merged and its migration applied (done 13 Nov).

## Findings

### Commit 1: `toBookingAmount` in `channexBookingRevisionImportService.js`

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `channexBookingRevisionImportService.js`, create and update calls: `...toBookingAmount(revision)` | `channexExternalBookingImportRepository.js` does not write `currency` yet, so after this commit alone a 250 GBP booking would be stored as `total_price` 250 without a currency and shown as €250. | Not blocking: this commit does not ship alone. It is the first exit criterion above, and the next commit adds it. |
| P2 (8/10) | `channexExternalBookingImportRepository.js`, `updateImportedBooking`: `total_price = COALESCE($6, total_price)` | The update keeps the old total when a modified revision has no amount. The currency must follow the same rule, or a booking could keep an old total with a new currency. `toBookingAmount` always returns both or neither, so `COALESCE` on each column keeps the pair together. | Next commit: `currency = COALESCE($n, currency)`, with a test that a revision without an amount keeps both. |
| Checked | `ISO_CURRENCY_CODE = /^[A-Z]{3}$/` | `requireStr` trims and the code is upper-cased first, so `" eur"` becomes `EUR`; `"EURO"` and `"€"` are refused and never reach the `VARCHAR(3)` column. A well-formed but unknown code such as `XYZ` passes; `Intl.NumberFormat` accepts any well-formed code, so the display step will not throw on it. | No change. |
| Checked | log event `CHANNEX_BOOKING_AMOUNT_CURRENCY_INVALID` | Renamed from `..._NOT_EUR`, which no longer fits; no CloudWatch metric filter, alarm or doc uses the old name (searched the repository). | No change. |
| Checked | tests | One test per path: valid code (3 rows), invalid or missing code (4 rows, warning logged), missing or unreadable amount drops the currency too (3 rows), and the update call passes `currency`. | No change. |

### Commit 2: `currency` in `channexExternalBookingImportRepository.js`

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | `createExternalBooking`, `INSERT ... booking_source, currency) VALUES (... $17, $18)` | 18 columns, 18 placeholders, 18 parameters with `row.currency` last; the test pins `params[17]`. Closes the P2 of commit 1 for new bookings. | No change. |
| Checked | `updateImportedBooking`, `currency = COALESCE($8, currency)` | Same rule as `total_price = COALESCE($6, total_price)`; because `toBookingAmount` returns both or neither, a revision without an amount keeps both, one with an amount replaces both. Closes the second P2 of commit 1. Cases: an old EUR booking (currency empty) modified in GBP gets both; a booking whose non-EUR amount was dropped before #3583 gets both on its next modification. | No change. |
| Checked | callers | `createExternalBooking` and `updateImportedBooking` are only called from `channexBookingRevisionImportService.js` (lines 1034 and 1216), which the webhook and the polling both use, so every import path writes the currency. | No change. |
| P3 (5/10) | repository | The repository trusts the code it gets and does not check it is 3 letters; `VARCHAR(3)` would reject a longer value with an error. | Accepted: the only caller validates with `ISO_CURRENCY_CODE`; checking twice adds code for a case that cannot reach it. |
| P3 (6/10) | tests, `params[17]` and `params[7]` | Positional asserts break when a column is added before them. | Accepted: the file already asserts by position (`params[5]`, `params[6]`); a renumbering shows as a clear failure, not a silent pass. |

### Commit 3: `bookingCurrency.js` (`bookingCurrencyCode`, `bookingCurrencyPrefix`)

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `bookingCurrency.js`, `currencyDisplay: "narrowSymbol"` | The narrow form gives "$" for USD, AUD, CAD and HKD, and "¥" for JPY and CNY (checked with `Intl` in Node), so an Australian host's booking would read as US dollars, the wrong-currency problem #3583 removes. | Fixed before the commit (Enes chose A): `currencyDisplay: "symbol"` gives A$, CA$, HK$, CN¥ and keeps €, £, $, ¥; test row AUD → A$ added. THB becomes "THB " instead of "฿", clear rather than wrong. |
| Checked | design | The helper returns only the prefix, not a formatted amount: the list shows "€300" and the details page "€300.00" today, so a full formatter would change every euro amount and its tests. Euro bookings look exactly as before. | No change. |
| Checked | `catch` | `Intl` throws a `RangeError` on a malformed code; the page then shows the code and a space instead of failing (tested with "EU"). | No change. |
| P3 (4/10) | performance | A new `Intl.NumberFormat` per row; the list renders one page of rows, so the cost is negligible. | Accepted, no cache. |

### Commit 4: list, details page and receipt

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | `HostReservations.js`, Total cell: `{bookingCurrencyPrefix(booking)}{total}` | A booking without a currency still shows "€300" (existing tests unchanged), a GBP one "£250". The commission cell keeps "€", which only Domits bookings in euros reach; Channex bookings show "–". | No change. |
| Checked | `HostReservationDetails.js`, "Total paid" row | Only the total uses the booking currency. The three `€` left (lines 1383, 1387, 1395) are the nightly-rate and cleaning-fee rows, shown only when `channelTotal === null`: a Domits booking or a Channex booking without an amount, both in euros. | No change. |
| Checked | data source | The list comes from `readByHostId`, which reads the full `Booking` entity (`getMany()` without a `select`), so `currency` reaches the page once #3900 maps it; the details page gets the booking from the list. | No change. |
| Checked | `downloadReservationReceiptPdf.js`, `formatMoney(amount, currency)` | `currency \|\| "EUR"` rather than a default parameter, because a default only covers `undefined` and `null` would print "null 250.00". Only the Total takes the currency; the breakdown is the Domits price in euros. | No change. |
| Checked | other screens | Only these two pages read the Channex total (`resolveChannexBookingTotal`); the guest dashboard never shows imported bookings, and the mobile app does not read `total_price`. | No change. |

### Commit 5: missed revenue leaves non-euro bookings out (`PriceLabs-Integration`)

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | `missedRevenueService.js`, revenue efficiency: "actual revenue only on the nights that also count toward potentialRevenue, so both sides cover the same nights" | With only the actual side skipping a non-euro booking, its nights still counted as potential with their PriceLabs price, so a host with one GBP booking got a too-low revenue efficiency. | Fixed before the commit (Enes chose A): `actualRevenueByProperty` returns `nonEuroNightsByProperty`, and those nights leave the potential side; they stay booked, so they are not missed revenue either. Test: one EUR and one GBP night, potential 100 not 400, efficiency 25%, missed 0. |
| Checked | `util/bookingCurrency.js`, `isEuroBooking` | Empty or `EUR` (trimmed, any case) is euros; one rule for missed revenue and, next, the PriceLabs push. The web helper cannot be reused: backend and web are separate npm workspaces. | No change. |
| Checked | `bookedDateSetByProperty` | Unchanged on purpose: a non-euro booking still occupies its nights. | No change. |
| Checked | data source | `getBookingsByHost` reads the full `Booking` entity (`find({ where: { hostid } })`), so `currency` arrives. | No change. |

### Commit 6: PriceLabs `pushReservations` leaves non-euro bookings out

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | `priceLabsService.js`, `pushReservations`: `bookings.filter(isEuroBooking)` before `_groupReservationsByListing` | Every entry is sent with `currency: "EUR"` (`_buildReservationEntry`), which is true again because only euro bookings reach it. `pushCalendar` still builds the booked dates from all bookings, so a GBP booking's nights stay blocked in PriceLabs. All callers (connect, `syncForBookingChange`, `POST /push/reservations`) go through this one method. | No change. |
| P3 (6/10) | same filter | A reservation that PriceLabs already received and that later becomes non-euro is no longer sent, so PriceLabs keeps its old entry, also after a cancel. Only a Channex booking imported before #3583 with a non-euro amount (stored then as no amount, no currency) and later filled by a modification or the #3582 backfill can get there. Availability is not affected: the calendar push stays correct. | Accepted: no such booking exists (no real host connected); revisit with #3582, which writes the currency of old bookings. |
| Checked | test harness `pushReservations.currency.test.js` | The API client, repository and SSM store are mocked, so the test touches no AWS, database or PriceLabs; implementations are set per test because the Jest config resets mocks. First test file for `priceLabsService.js`. | No change. |

### Commit 8: PriceLabs push keeps non-euro bookings, with amount 0 (review by Puok on #3915)

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (review) | `priceLabsService.js`, `pushReservations`: the filter of commit 6 | Puok: a booking PriceLabs already has would go stale once it is left out, also after a cancel. PriceLabs' integration docs are not public, but our own code sends cancellations as entries (`status: "canceled"`, `cancel_time`), which points to updates per `reservation_id`. This replaces the accepted P3 of commit 6. | Changed: no filter; `_buildReservationEntry` sends `total_cost: 0` for a non-euro booking. That is what PriceLabs received for these bookings before #3583 (their amount was dropped on import), so status and cancels keep syncing and no non-euro amount is sent as euros. |
| Checked | `pushReservations.currency.test.js` | Two tests: all three bookings sent with GBP at 0; a cancelled GBP booking is sent as canceled. Both are red against the commit-6 code (checked by stashing the change). The first version of the second test read `mock.calls[0]`, the call of the test before; fixed with `jest.clearAllMocks()` in `beforeEach`. | No change. |

## Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| Channex sends a currency that is not a 3-letter code | Yes | Neither amount nor currency stored, warning logged | The page shows the Domits price, as before #3583 |
| Channex sends an amount without a currency | Yes | Same as above | Same as above |

## Not in scope

- Filling the currency of existing Channex bookings: #3582 (backfill).
- Exchange-rate conversion and summing totals across currencies: out of #3583.

## What already exists

`toAmountOrNull` (0 is not a free stay) and `requireStr` (trim) are reused; the create and update paths already shared one amount function, so they still do.
