# #3099 Request to book a property from an Elite website

Branch: `elite-site-properties-request-page`, from `acceptance`. Issue: #3099. Reviewed before every commit, each guard broken on purpose, then a second review.

```
stay ─▶ usable? ─no─▶ booking panel ─▶ /request?stay
          │yes
          ▼
        quote ─▶ refused ─▶ booking panel, or an alert and back to the property
          ▼
summary + form ─▶ send (key per site, property and stay) ─▶ sent | notice, quote again, new dates
```
| Risk | Where it is closed |
|---|---|
| Dates or guests missing, in the past, out of order, longer than a year, not real | `readSitePropertyStayQuery` leaves them out; the page shows the booking panel and quotes nothing. |
| More guests than the property takes, dates taken | The quote refuses them; the page shows the booking panel with the refusal at its field and no form. |
| A slug the site does not serve | The routing shows the not found page; nothing is quoted. |
| A double click on send | The button is off while sending and a send in flight blocks the next. |
| The price expires between the summary and the send | Expired on the page: the price is marked and a send quotes again instead. Expired on the server (`quote_expired`): the page quotes again, keeps what the guest typed and sends the new price on the next click. |
| A reload | The stay stays in the address and is quoted again; typed fields are not stored. After an unknown outcome the same key is sent again; the server replays the stored request only for the same name and email (`replayResponse`), and otherwise answers `idempotency_key_reused`, so the hook sends a new request with a new key. |
| Single-property sites | The quote panel is unchanged: its key per quote, its form and its body. The price card and Book keep `#availability` when no list is served. Pinned by the existing quote panel, booking hook and Panorama page tests. |

Not closed: what the guest typed is lost when they choose other dates, because the page reloads for the new stay; the "request sent" page and a resend after a success, which `elite-site-properties-request-sent` handles.

Guards broken on purpose: 11 of 13 caught one at a time, then 3 of 3 for the name and email check and 4 of 4 for the send handling moved out of the page; the two that survived, the disabled button and the send in flight, cover each other and are caught together. Second review: the reload test kept the module's key in memory, so it would pass if the stored key were not read; a reload test of the key store now reads it from a fresh module. Third review: a guest who fixed their email after an unknown outcome got the old request back (fixed on the server, for the quote panel too), and the page was too complex for Sonar (the summary and the send outcome now have their own parts).
