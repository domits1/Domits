# docs: design note for host self-distribution through Channex (#506)

Pull request: #3954
Issue: #506
Reviewed commit: working tree on branch `docs/506-host-self-distribution-design`, 17 and 18 Nov 2026
Result: 1 blocking (P1), fixed in the note; 6 non-blocking, all decided

The note: `docs/partner/integrations/channel_manager/channex/channex_host_self_distribution_design.md`. The review ran twice: on the first draft (17 Nov), and on the rewrite with decisions D1–D10 (18 Nov).

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | First draft, D2 and section 4 | The note put every host's listing under Domits' one Channex account, but the code finds the account per user (`channexMappingService.js:102` `findByUserIdAndChannel(userId, "CHANNEX")`) and only lets the listing's owner save a mapping (#3365, `checkPropertyOwner`). A real host has no account row and could not be connected at all. | Fixed: D8, one account row per host whose `credentialsRef` points to Domits' one secret. Checked that polling runs per account over that account's own mappings (`channexBookingPollingService.js:312`) and the webhook finds the account through the property mapping (`channexBookingWebhookService.js:69`), so shared-key rows do not import each other's bookings. Extra build step: reconnect resets every row with the same `credentialsRef`. |
| P3 (8/10) | First draft, section 8 | "Well inside the 60-second timeout" was never checked, and the routes do not run where the note said. | Fixed: the routes go through `/integrations/channex/{proxy+}` to UnifiedMessaging (found for #2869); the text no longer names a number. |
| P3 (7/10) | First draft, section 8 | "A full sync uses 2 calls" reads as a global number. | Fixed: 2 calls per property; Channex limits are per property. |
| P2 (8/10) | Rewrite, D9 | "When a listing leaves ACTIVE" named no trigger. Status is written in more than one place (`propertyRepository.js:104` `updatePropertyStatus`, called from `propertyService.js:292` and `:1181` for archive, plus a compare-and-swap update at `propertyRepository.js:167-190`). A missed path leaves an archived listing for sale with no test, no handling and no visible symptom. | Fixed: reconciliation in the outbox worker (every minute: channel ACTIVE and listing not ACTIVE → D5). Catches every write path, including future ones. |
| P2 (5/10, unverified) | Rewrite, D5 | stop_sell stays on a deactivated channel. If the iframe re-activates that old channel, the dates stay closed while Domits shows "Live". | Fixed: `refresh` removes a leftover stop_sell from an active channel, and the D9 loop does the same for live listings. Staging check added: does the iframe reuse a deactivated channel. |
| P3 (7/10) | Rewrite, section 11 | Disconnect, D9 and D10 add Channex calls to the outbox worker, which has no time budget or row caps yet (#3927). Price syncing for every host could wait behind them. | Fixed: #3927 moved before the disconnect step; each new job gets its own cap per run. |
| P3 (8/10) | Rewrite, section 9 | No tests for D4 (timezone), D7 (labels) and the D9 loop. | Fixed: tests listed; D7 as one pure function, table-tested like `evaluateChannexHealth`. |

## Decisions made while walking through the note (17–18 Nov)

These are design choices, not review findings. The note holds the options and the reasons.

- D1: Channex iframe for v1. Accepted risk: the one-time token is account-wide. Switch trigger: before a second real host connects.
- D3: only live listings with location, max guests and a price.
- D4: timezone from the country; the host picks only in multi-timezone countries.
- D5: toggle off = close (stop_sell), then the worker disconnects after the wait time. No paused state.
- D6: Vrbo in v1 (the password goes into Channex's screen). No Vrbo test account exists.
- D10: listing edits reach Channex through an outbox row.

## Not in scope

- Content sync, creating OTA listings, multiple room types or rate plans (#3568).
- Our own connect form on the Channel API: only if the D1 switch trigger fires.
- A separate Lambda for distribution jobs: the caps from #3927 are enough at this volume; revisit when volumes grow.
- Billing: Stefan's decision, not part of this design.
- Channex support answers (token per property, hiding Deactivate, sync after deactivate): asked on 18 Nov; the note changes if the answers do.
