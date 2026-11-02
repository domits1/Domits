# feat: send restrictions to SiteMinder over pmsXchange #603

Pull request: #3676
Issue: #603
Reviewed commit: 478a7215f
Result: 1 blocking finding (code comments), fixed in this push. No blocking findings left in the code.

The review ran after the pull request was opened, not before. That was a process miss on my side.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | backend/functions/SiteMinder-Integration/business/siteMinderRestrictionsPusher.js and util/restrictionsMessage.js | Five code comments. The team does not keep comments in the code. | Fixed: removed. What they explained is in the PR description: CTA and CTD each need their own AvailStatusMessage, because one message carries one RestrictionStatus, and a restriction that is left out keeps its current value at SiteMinder. |
| P2 (7/10) | backend/functions/SiteMinder-Integration/util/restrictionsMessage.js:3 `const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;` | The date check only looks at the shape, so a date that does not exist, like 2026-02-30, is sent. | Accepted here: fixed in #3701 (commit 11219a49f, `isIsoDate` in `util/otaValues.js`), which also covers restrictions. Nothing calls the pusher yet, so the gap cannot reach SiteMinder in between. |
| P3 (6/10) | backend/functions/SiteMinder-Integration/util/restrictionsMessage.js:4 `const REMOVE_MAX_STAY = 999;` | `maxStay: null` is sent as 999 to remove the maximum stay. This depends on how SiteMinder reads 999. | Accepted: Enes checked this mapping in his review. Covered by restrictionsMessage.test.js. Not checked against the pmsXchange docs in this review. |
| P3 (5/10) | backend/functions/SiteMinder-Integration/util/restrictionsMessage.js:42 `function assertNoOverlaps(items)` | The overlap check compares every item with the others of the same room rate, so it grows with the square of the items. | Accepted: one push holds the restrictions of one hotel for a short range, so the lists are small. |
| P3 (4/10) | backend/functions/SiteMinder-Integration/business/siteMinderRestrictionsPusher.js:12 `return this.soapClient.send(body, { echoToken });` | The pusher does not retry. | Accepted: the caller decides, with `retryable` on the error. The Lambda that calls it is not built yet. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| `buildRestrictionsNotif` | item without a ratePlanCode | yes | throws before anything is sent | yes, a clear error |
| `buildRestrictionsNotif` | overlapping dates for the same room rate | yes | throws before anything is sent | yes |
| `buildRestrictionsNotif` | minStay above maxStay, or minStay null | yes | throws before anything is sent | yes |
| `buildRestrictionsNotif` | a date that does not exist | no on this branch, yes from #3701 | sent as is here, refused from #3701 | no on this branch |
| `push` | SiteMinder refuses the message (OTA Errors) | yes, in the SOAP client tests | `SiteMinderSoapError`, not retryable | yes |

## What already exists

- `escapeXml` and `otaHeaderAttributes` from `util/otaXml.js` (the availability PR, #3671) are reused for the XML.
- `SiteMinderSoapClient` and `newEchoToken` are reused for sending, like the availability pusher.

## Not in scope

- A SiteMinder docs file on this branch: it is added in #3701, and adding it here too would give a conflict.
- The Lambda handler and schedule that call the pusher: a later pull request.
