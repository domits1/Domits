# #3099 Accept booking requests for any property of an Elite website

Pull request: `elite-site-properties-booking`, on top of `elite-site-properties-quote`.
Issue: #3099
Reviewed: every commit before it was made, then a second review of the pull request as a whole, then each guard broken on purpose one at a time.

## What changed

`POST /public/sites/{siteId}/bookings` (General-Bookings) no longer refuses a quote token whose property is not the site's own. The rules for another property are not rebuilt here: the live price check sends the token's property to the quote route, which checks them again.

```
book ▶ phone, message checked (400) ▶ token: site = path site, property required ▶ replay? same site, property, dates, guests
     ▼
 site PUBLISHED ▶ re-quote: own property ─▶ the same body as before
                            other property ─▶ + propertyId ─▶ list, Elite plan, snapshot, ACTIVE, host ─no─▶ 404 property_not_found
     ▼ answer names the token's property? ─no─▶ 503, nothing stored
     ▼ same price? ─no─▶ 409
 conflicts on that property ▶ Inquiry row (property_id = token's) ▶ event ▶ guest email, host email (phone, quoted message)
```

Mutants: 42, 41 caught. The survivor sets `bookingInfo.propertyId` to another value: the email builder carries that field but prints only the property name, so nothing changes.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | API Gateway `92a7z9y2m5`, stage `development` | Data trace is on for this route, so the first 1024 bytes of every request body go to CloudWatch, without retention. A phone or message a client sends would be logged whatever the code does. | Not a code change. Data trace must be off for this route before the request page sends them. It is a stage setting and needs no deployment. |
| P3 (8/10) | `publicSiteBookingRequestService.js`, `confirmLivePrice` | The re-quote is the only check of another property in General-Bookings. | Intended: it fails closed on an invoke error, a Lambda error, a 404 and an answer for another property. Each is tested. |
| P3 (8/10) | `publicSiteBookingRequestService.js`, `recordRequestedEvent` | `property_id` of the event stays the site's own property; the booked property is in the payload. | Kept: the same meaning as the quote events of the previous pull request. |
| P3 (8/10) | `publicSiteBookingRequestService.js`, `validateGuestContact` | The guest name still accepts line breaks, so it can add lines to the host email. | Not in scope: existing validation. |
| P3 (9/10) | `sendBookingRequestEmails.js` | An answer `{ statusCode: 500 }` of the email Lambda still counts as sent. | Not in scope: existing behaviour. |
| P4 (7/10) | `publicSiteBookingRequestService.js`, re-quote and insert | A property deactivated between the re-quote and the insert is still stored as an Inquiry. | Accepted: the main property has the same window; the host accepts or declines. |
| P4 (8/10) | `sendBookingRequestEmails.js` | When both emails fail, only the first error is logged. | Accepted: both failing has one cause. |

Second review, round one:

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (medium) | `reservationController.js`, the body | API Gateway logs the body, also of refused requests, before the code runs. | The same as the P1 above: the setting, not the code. |
| P2 (high) | `publicSiteBookingRequestService.js`, `createBookingRequest` | Between the re-quote and the insert, the property can be removed, deactivated or moved, or Elite can end, and the Inquiry is still stored. | Accepted, not changed. The window is a few reads long; the main property has it today too. Closing it needs a lock across two Lambdas, and checking part of it here would repeat the quote rules. The request goes to the host of the website the guest used, and the host still has to accept it. |

No code defects, so no second round.

## Choices that can be changed later

- `guest.phone` and a top-level `message` in the body; the limits (6 to 15 digits, 32 characters; 2000 characters).
- The guest message comes in the host email with each line quoted with `> `, so the guest cannot write lines that look like the email's own.
- The answer of a booking has no `propertyId`; the page knows which property it requested.

## Not in scope

- The request page that sends phone and message: a later pull request, after the API Gateway setting.
- A payment link for website guests: decided, not in the first version.
