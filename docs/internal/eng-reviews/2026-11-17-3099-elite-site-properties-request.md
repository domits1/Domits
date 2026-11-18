# #3099 Request to book a property from an Elite website

Pull request: `elite-site-properties-request`, after `elite-site-properties-photos`, built on `elite-site-properties-page`. Issue: #3099. Reviewed before every commit, then each guard broken on purpose, then two rounds of a second review.

`/properties/<slug>/request` quotes the stay of the link again, shows the stay and the total, and sends name, email, optional phone and optional message through the booking request of the quote panel.

```
query ─▶ quote (propertyId only for another property) ─▶ form ─▶ useWebsiteBookingRequest (key per site, property and stay) ─▶ sent page | field or panel error
```

| Severity | Finding | Decision |
|---|---|---|
| P1 (9/10) | After an unknown outcome, a new price or a send for another stay gave the next send a new key, so a second request could be stored. | Fixed: on this page one key record per site and stay, kept until a send succeeds. |
| P2 (8/10) | Tests did not check the corrected field in the second send, nor a changed price after `quote_expired`. | Fixed. |
| P2 (7/10) | What the guest typed is lost after going back to the property page. | Kept: it survives every failure on the page; guest data stays out of storage. |
| P2 (6/10) | A price that expires between the 30 second checks can still be sent. | Kept: the server answers `quote_expired` and the page quotes again, as the quote panel does. |

Mutants: 50 of 52 caught; the send guard sits behind a disabled button, and a reused key on this page needs another stay, which the key rules out. Not in scope: the house rules checkbox and the "You pay" step of the canvas, keeping the sent page across a reload.
