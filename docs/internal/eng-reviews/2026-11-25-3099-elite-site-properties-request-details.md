# #3099 Ask the guest's details on the request to book page of an Elite website

Branch: `elite-site-properties-request-details`, on `elite-site-properties-request-sent`. Issue: #3099. Reviewed before every commit, each guard broken on purpose, then a second review. No backend change.

The request page shows the three steps (your details, host confirms, you pay) and its own form (`EliteSitePropertyRequestForm.jsx`): first and last name, joined into `guest.name`; email; an optional phone and an optional message to the host, which the booking request already accepts and mails to the host; and, when the listing has house rules, those rules with a box that must be ticked. The checks are in `eliteSitePropertyRequestDetails.js`. The quote panel of a site with one property keeps its own form and sends the same body as before.

| Risk | Where it is closed |
|---|---|
| A name of only spaces | Both names are trimmed and required; the joined name may be at most 255 characters, as the server takes. |
| Phone and message rules apart from the server | Same pattern, 6 to 15 digits and at most 32 characters for the phone; the message is cleaned as the server cleans it (line breaks, tabs, invisible characters, blank lines) and may then be at most 2000 characters, and the page sends it cleaned. The tests run each sample through the server's own `readGuestNote`. |
| A refusal of the phone or the message by the server | `invalid_guest_phone` and `invalid_guest_message` show at their field, with what the guest typed. |
| The house rules box when a send fails | It stays ticked after a failed send and after the price is checked again; it starts empty for every new stay. |
| A listing without house rules | No box, and the request sends without it. |
| The quote panel of single-property sites | Phone and message are only added to the body when given; the old body is pinned. |

Not closed: the server does not store the phone, the message or the acceptance of the house rules; it only mails phone and message to the host. Storing them is a backend change.


Guards broken on purpose: 12 of 12 caught. Second review: the message was only trimmed before its length check, so a message the server accepts after joining blank lines was refused (fixed, the message is cleaned as on the server); ticking the house rules box left its error until the next send (fixed).
