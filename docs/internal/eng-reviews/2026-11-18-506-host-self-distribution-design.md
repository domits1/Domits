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
| P2 (5/10, unverified) | Rewrite, D5 | stop_sell stays on a deactivated channel. If the iframe re-activates that old channel, the dates stay closed while Domits shows "Live". | Fixed: `refresh` removes a leftover stop_sell from an active channel, and the D9 loop does the same for live listings. Staging check added: does the iframe reuse a deactivated channel. Later superseded: D5 no longer uses stop_sell (see "Channex answers" below), so there is no leftover rule to remove. |
| P3 (7/10) | Rewrite, section 11 | Disconnect, D9 and D10 add Channex calls to the outbox worker, which has no time budget or row caps yet (#3927). Price syncing for every host could wait behind them. | Fixed: #3927 moved before the disconnect step; each new job gets its own cap per run. |
| P3 (8/10) | Rewrite, section 9 | No tests for D4 (timezone), D7 (labels) and the D9 loop. | Fixed: tests listed; D7 as one pure function, table-tested like `evaluateChannexHealth`. |

## Findings from the PR review (Rakib, Mehedi, Karim, 18 Nov)

| Point | From | Decision |
|---|---|---|
| D1 needs a hard guard (allowlist on `connect-session`) until the token scope is settled | Rakib, Mehedi, Karim | Not added. Channex confirmed the token is limited per property after the reviews were written; there are no real hosts yet, and the cross-property check runs during testing before any host is onboarded. Written in D1. |
| D2: two "turn on" requests at the same time create two Channex properties | Mehedi, Karim | Fixed: claim the listing first with a `PROVISIONING` mapping row under a unique key on `domitsPropertyId` (`ChannelIntegrationProperty` has none today, so a migration adds it). Test added. The key changed on 19 Nov to account plus listing, see Karim's re-review below. |
| D9: does editing a live listing make it non-ACTIVE and disconnect every OTA? | Rakib, Mehedi | No: submit for review only starts from INACTIVE, REJECTED or ARCHIVED (`SUBMITTABLE_FOR_REVIEW_STATUSES`, `propertyStatus.js`). The live and not-live statuses are now listed in D9. |
| D5: deactivating inside Channex's screen skips stop_sell | Mehedi | Written in D5: detected as "Needs attention", the host is told to close the dates in the OTA; Domits cannot close them once the channel is off. Channex later confirmed the button cannot be hidden; see "Channex answers" below. |
| How the frontend knows the host finished in the iframe | Rakib | Closing the modal always calls `refresh`, whether or not Channex sends a message. Written in section 6. |
| A list of screens and states | Rakib | Added to section 6, pointing to the suggested pages shared on 18 Nov. |
| Show upcoming OTA bookings in the disconnect confirm | Rakib | Added to D5 (count from `booking_source`), with a test. |
| Country → timezone is wrong for the Canary Islands and the Azores | Mehedi | Fixed: Spain, Portugal, Chile and Ecuador join the countries where the host picks. |
| D10 should include the property type | Mehedi | Added. |
| EUR is hard-coded in D2 | Mehedi | No change: Domits prices are in euros. |
| Who pays the $0.50 per unit | Karim | No change: billing is Stefan's decision, outside this design. |
| Re-review (19 Nov): a unique key on `domitsPropertyId` alone blocks a listing on Channex and SiteMinder at once (same table, `integrationPropertyRepository`), and the index build fails on existing duplicates | Karim | Fixed in D2: unique on `integrationAccountId` plus `domitsPropertyId`; still catches the double click because both requests use the host's one account row (D8). Duplicate check on the current rows before the migration. Verified: `SiteMinder-Integration/business/createSiteMinderServices.js:3` imports the shared repository. |

## Channex answers (18 Nov) and what changed

| Answer from Channex support | Decision |
|---|---|
| Close with availability 0, wait about a minute, then deactivate | D5 changed from stop_sell per channel to availability 0 on the room type. Because availability is shared by all the listing's OTAs, the worker holds the listing's outbox rows while a channel is `DISCONNECTING`, deactivates after the wait, then releases the rows and runs a full sync so the other OTAs reopen. Accepted cost: the other OTAs are closed for about two minutes during a disconnect (a lost booking attempt at worst, never a double booking). No follow-up question needed. stop_sell and its leftover cleanup are gone from the design. Eng-review of this change, P2 (8/10): a deactivate that keeps failing would hold the outbox forever and keep the other OTAs closed. Fixed in D5: after the retry limit the row goes to `ERROR`, which ends the hold. |
| The iframe cannot hide Deactivate; own screens recommended if that control is needed | Kept the iframe, accepted the risk and inform the host: an extra checkbox in the connect checklist ("I will disconnect only with the switch on this page") and a warning line under the Channex screen; detection as "Needs attention" stays. Own screens on the Channel API are the follow-up if it happens in practice. Whether the checkbox shifts responsibility legally is for the terms of service. |

## Decisions made while walking through the note (17–18 Nov)

These are design choices, not review findings. The note holds the options and the reasons.

- D1: Channex iframe. First written as an accepted risk (account-wide token, switch before a second real host). Channex support confirmed on 18 Nov that the token is requested per `property_id` and limits the session to that property, so the risk became a verification step before release: a token for property A must not open property B.
- D3: only live listings with location, max guests and a price.
- D4: timezone from the country; the host picks only in multi-timezone countries.
- D5: toggle off = close first, then the worker disconnects. No paused state. The close method changed after Channex's answer (below).
- D6: Vrbo in v1 (the password goes into Channex's screen). No Vrbo test account exists.
- D10: listing edits reach Channex through an outbox row.

## Not in scope

- Content sync, creating OTA listings, multiple room types or rate plans (#3568).
- Our own connect form on the Channel API: only if the D1 verification fails.
- A separate Lambda for distribution jobs: the caps from #3927 are enough at this volume; revisit when volumes grow.
- Billing: Stefan's decision, not part of this design.
- Channex support answers: token per property answered yes on 18 Nov (D1 updated); hiding Deactivate and sync after deactivate still open; the note changes if those answers do.
