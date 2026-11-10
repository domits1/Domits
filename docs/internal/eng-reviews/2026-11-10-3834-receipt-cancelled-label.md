# fix(hostdashboard): label the cancel date on the receipt as "Cancelled on"

Pull request: #3837
Issue: #3834 (part 1)
Reviewed commit: staged diff on `fix/3834-receipt-cancelled-label`, before the first commit
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | `HostReservationDetails.js:646-653` | `reservation.status === "CANCELLED"` now appears in three helpers next to each other (`resolvePaymentDate`, `resolvePaymentDateLabel`, `buildPaymentDateText`). | Accepted: three short lines that read clearly; an `isCancelled` helper would be a refactor, which goes in its own commit if the file is touched again. |
| Checked | `HostReservationDetails.js:778`, channel-paid bookings | A cancelled OTA booking shows "Collected by the channel" with "Cancelled on". | No change: since #3800 the date of a cancelled booking is already the cancel date, so the new label is the correct name for it. |
| Checked | `downloadReservationReceiptPdf.js:302` | The PDF has one caller, the reservation page; the fallback keeps "Payment date" for any receipt built without the new field. | Covered by the fallback test. |

## Not in scope

- Part 2 of #3834: showing whether a cancelled paid reservation was refunded (Mounir, related #2655).
- The receipt texts are English only, like every other label in the PDF; translating the receipt is separate.
