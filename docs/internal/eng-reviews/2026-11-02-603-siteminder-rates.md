# feat: send nightly rates to SiteMinder over pmsXchange #603

Pull request: #3692
Issue: #603
Reviewed commit: 189ca56c3
Result: 1 blocking finding (code comments), fixed in this push. Three findings in the code are fixed in the next pull request (#3701), and nothing calls this code yet.

The review ran after the pull request was opened, not before. That was a process miss on my side.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | backend/functions/SiteMinder-Integration/business/siteMinderRatesPusher.js and util/ratesMessage.js | Four code comments. The team does not keep comments in the code. One of them was also wrong: it said the price is "after tax". | Fixed: removed. What they explained is in the PR description: one RateAmountMessage per room rate, with one Rate per date range, in the order they were given. |
| P2 (9/10) | backend/functions/SiteMinder-Integration/util/ratesMessage.js:44 `AmountAfterTax="${rate.amount.toFixed(2)}"` | Domits prices are net, so they must be sent as `AmountBeforeTax`. | Fixed in #3701 (commit 12c596c4b). Nothing calls the rates pusher yet, so a wrong price cannot reach SiteMinder in between. |
| P2 (8/10) | backend/functions/SiteMinder-Integration/util/ratesMessage.js:44 `rate.amount.toFixed(2)` | `toFixed(2)` works on binary floats, so for example 1.005 becomes "1.00" instead of "1.01". | Fixed in #3701 (commit 11219a49f, `toAmount` in `util/otaValues.js` rounds half up). |
| P2 (7/10) | backend/functions/SiteMinder-Integration/util/ratesMessage.js:3 `const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;` | The date check only looks at the shape, so a date that does not exist, like 2026-02-30, is sent. | Fixed in #3701 (commit 11219a49f, `isIsoDate`). |
| P3 (6/10) | backend/functions/SiteMinder-Integration/util/ratesMessage.js:17 `if (!CURRENCY.test(item.currency ?? ""))` | Only the shape of the currency is checked, not that it is the hotel's currency. SiteMinder does not convert it. | Fixed in #3701: `siteMinderInventoryService.js` refuses rates in another currency than the configured Domits currency (`SITEMINDER_WRONG_CURRENCY`). |
| P3 (4/10) | backend/functions/SiteMinder-Integration/business/siteMinderRatesPusher.js:12 `return this.soapClient.send(body, { echoToken });` | The pusher does not retry. | Accepted: the caller decides, with `retryable` on the error. The Lambda that calls it is not built yet. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| `buildRatesNotif` | amount 0, negative or not a number | yes | throws before anything is sent | yes, a clear error |
| `buildRatesNotif` | overlapping dates for the same room rate | yes | throws before anything is sent | yes |
| `buildRatesNotif` | currency that is not a 3-letter code | yes | throws before anything is sent | yes |
| `buildRatesNotif` | a date that does not exist | no on this branch, yes from #3701 | sent as is here, refused from #3701 | no on this branch |
| `push` | SiteMinder refuses the message (OTA Errors) | yes, in the SOAP client tests | `SiteMinderSoapError`, not retryable | yes |

## What already exists

- `escapeXml` and `otaHeaderAttributes` from `util/otaXml.js` are reused, like in the restrictions message (#3676).
- `SiteMinderSoapClient` and `newEchoToken` are reused for sending.
- The overlap check follows the same rule as `assertNoOverlaps` in the restrictions message. The two are not shared yet; they compare different item shapes.

## Not in scope

- Sharing one overlap check between rates and restrictions: two cases, and the item shapes differ. Worth doing when a third message needs it.
- The Lambda handler and schedule that call the pusher: a later pull request.
