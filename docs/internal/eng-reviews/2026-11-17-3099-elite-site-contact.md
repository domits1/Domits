# #3099 Contact messages from an Elite website

Pull request `elite-site-contact-endpoint`, on top of `elite-site-properties-render`. Reviewed before every commit, by a second reviewer in three rounds (the last finding, a 500 answer, fixed after round three), and with each guard broken on purpose (72 mutants, all caught).

| Severity | Finding | Decision |
|---|---|---|
| P1 (9/10) | The deployed `EmailNotificationService` drops `replyTo` and still answers 200. | 200 only when the answer confirms the reply-to (a Lambda change for Karim); until then 504, so the flag goes on last. |
| P2 (9/10) | Our time limit, a lost answer or an unusable answer cannot prove the email was not sent. | Only a 400 of the email Lambda or a refused call answers 503 `message_not_sent`; everything else 504 `message_not_confirmed`. One call attempt, never retried. |
| P2 (9/10) | No deadline before the send; an event write after a sent email could be lost or slow. | 15 s for everything before the send, 8 s for it, nothing after. The request row is written before the send; a failed write sends nothing. |
| P2 (9/10) | Count then insert is not atomic, so concurrent requests can pass 20. | Accepted: an exact limit needs a counter table (written for Karim). |
| P2 (9/10) | A second plan read could answer `property_not_found`. | One plan read per request; `website.multi_property` decides the list from it. |
| P3 (8/10) | Email dots, 10 MB fields, untested subject cut, limits read from the code, logs checked on success only. | Fixed and tested; logs are checked after every test. |
| P3 (8/10) | The Cognito email lookup repeats `listingReviewNotifier.js`. | Follow-up with #3302's cross-function lookup. |
| P4 (6/10) | Outer whitespace is trimmed before the checks. | Accepted: nothing that reaches the email holds a control character. |

Decisions: `website.unlimited_pages` gates the route because the Contact page is a `sitePages` page. A per-IP limit in Lambda memory was built and dropped: each instance counts alone, and it held guest IPs.

Not in scope: the Contact page (`elite-site-contact-page`), the AWS steps (email Lambda reply-to, API Gateway route, flag), a captcha or honeypot.
