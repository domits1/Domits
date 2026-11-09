# feat: ask SiteMinder for reservations and confirm them #603

Pull request: not opened yet (branch `feature/603-siteminder-reservations-read`, on top of #3806)
Issue: #603
Reviewed commit: dd335b620
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made, then the branch against `feature/603-siteminder-reservations-parser`.

Second step of receiving SiteMinder reservations: the messages to ask for undelivered reservations (`OTA_ReadRQ`) and to confirm or fail them (`OTA_NotifReportRQ`), and `SiteMinderReservationsReader` that sends them. Saving reservations as bookings comes in the next pull request.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationsReader.js `readUndelivered` | One reservation without a SiteMinder id or message id makes `readReservations` throw, so the whole batch is not handled and SiteMinder keeps sending it until it marks it failed after an hour. | Accepted here: both ids are mandatory in SiteMinder's schema. The saving step will skip and report such a reservation instead of failing the batch. |
| P3 (6/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationsReader.js | Two runs at the same time can read the same reservations. | Accepted here: the saving step will build the booking id from the SiteMinder id, like the Channex import, so a second read does not create a second booking. |
| P3 (6/10) | backend/functions/SiteMinder-Integration/util/reservationsMessage.js `buildReservationFailure` | The error text goes to SiteMinder and can be shown to the hotel. | Accepted: the text is cut to 200 characters and escaped. The caller passes fixed texts without guest data; written in the docs. |
| P4 (6/10) | backend/functions/SiteMinder-Integration/data/siteMinderSoapClient.js `return { success: true, echoToken, xml: text }` | The ARI pushers now also return the answer XML to their callers. | Accepted: there is no handler yet that logs it. The handler pull request must log a summary only, never the XML, because a reservation answer holds guest data. |
| P4 (5/10) | backend/functions/SiteMinder-Integration/util/reservationsMessage.js `buildReservationsRead` | The `POS` line is the same as in `availabilityMessage.js:51`. | Accepted: one line, not worth a helper. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| `readUndelivered` | SiteMinder does not answer, or answers 5xx | yes, in the SOAP client tests | `SiteMinderSoapError` with `retryable` true | yes, the run fails (once the run exists) |
| `readUndelivered` | wrong login | yes, in the SOAP client tests | SOAP fault, not retryable | yes |
| `confirm` | nothing was saved | yes | no call to SiteMinder | no |
| `confirm` | a reservation without booking id or with an unknown status | yes | throws before anything is sent | yes, the run fails |
| `reportFailure` | an empty error text | yes | throws before anything is sent | yes |

## What already exists

- `SiteMinderSoapClient` already sends, logs in, times out and classifies errors. The only change is that it returns the answer XML.
- `otaHeaderAttributes` and `escapeXml` from `util/otaXml.js` are reused for the new messages.
- The confirmation follows SiteMinder's field table, which says `ResID_Value` is the PMS reservation id. The example XML in their docs shows the SiteMinder id there instead; the table is followed.

## Not in scope

- Saving reservations as bookings, mapping the hotel and room type to a Domits property, and the deterministic booking id: next pull request.
- The schedule (every 2 to 5 minutes), the kill switch and sending availability after a reservation: later pull request.
- Reading per hotel (`HotelCode` in `OTA_ReadRQ`): not needed, Domits works per PMS.
