# Channex booking webhook: design note

| | |
|---|---|
| Issue | #3281 (parent #2861, capability #440) |
| Related | #3236 Channex inbox (message webhook, #3447), #3278 ARI outbox, #3282 full sync, #3284 certification cleanup |
| Author | Enes Veli Yigit |
| Status | Implemented in #3456 (review changes included). Live test pending after deployment. |
| Date | 6 October 2026 |

## 1. Summary

Channex calls a new endpoint, `POST /webhooks/channex/bookings`, whenever a booking revision (new, modified or cancelled) arrives for a mapped property. The endpoint checks a shared-secret header, takes the same per-property lock as booking polling, and runs the existing pull: read the property's unacknowledged revision feed, store each revision as a Domits booking, and acknowledge it only after it is stored.

The webhook decides when Domits pulls, not what it stores. Almost all processing already exists and is tested; the new parts are the route, the secret check, a lookup from the Channex property id to the Domits mapping, the HTTP status on the provider's feed and acknowledgement results, a time budget for the pull, and a mapping from the pull result to an HTTP status.

## 2. Problem

Domits only receives Channex bookings by pulling the revision feed, started from the admin panel or by scheduled polling. Polling is off unless `CHANNEX_BOOKING_POLL_ENABLED` is set (`utils/channexBookingPollUtils.js:45`). A booking made on an OTA therefore does not reach Domits by itself, and its dates stay open on the other channels.

Sources:
- Channex certification requirements: "A webhook endpoint to receive bookings from Channex and an acknowledgement flow."
- Channex scenario 11: "Be sure that you send Booking Acknowledge message. It is required step for certification."
- Channex webhook documentation: the booking event "was originally designed to trigger a Pull booking revision operation from the PMS", and webhooks "may come out of order".

## 3. Goals and non-goals

Goals:
- A booking made on an OTA is stored in Domits within seconds, exactly once, and acknowledged.
- Only Channex can trigger the endpoint.
- One revision that can never be stored does not block the others, and does not make every later webhook fail.

Non-goals:
- Message webhooks. Those belong to the Channex inbox (#3236, #3447) on their own endpoint.
- Turning polling back on as a backup. That is a separate decision after the certification review.
- Registering webhooks through the API for every host. For certification one property webhook is created by hand; a global webhook is the option for many hosts later.

## 4. What already exists and is reused

| Piece | Where | How it is used |
|---|---|---|
| Pull the feed for one property, store, acknowledge after storing | `services/channexBookingRevisionImportService.js:1755` (`pullLatestChannexBookingsForResolvedContext`) | Called as is, with `trigger: "WEBHOOK"` |
| Feed of unacknowledged revisions, oldest first | `providers/channex/providerClient.js:774-776` | Out-of-order webhooks do not matter: the feed has the order |
| One booking per reservation | `channexBookingRevisionImportService.js:975-983` (deterministic booking id) | A retried or duplicated webhook reuses the stored booking |
| Per-revision error isolation | `channexBookingRevisionImportService.js:1319-1334`, `:1455-1466` | A failing revision is returned as unacknowledged; the loop continues |
| Per-property lock | `services/channexBookingPollingService.js:86-117` (`integration_sync_state`, key `booking_poll:<domitsPropertyId>`) | Same key, so the webhook and polling never run at the same time for one property |
| Reading the account's Channex credentials | `services/channexBookingPollingService.js:228` | Same checks |
| Routes that skip the Cognito check | `handler/channelManagementHandler.js:119-125` (internal-token routes) | Same pattern for the webhook route |
| `lastErrorCode` on the integration account | `.shared/integrations/repositories/integrationAccountRepository.js:74` | Set when the Channex key stops working |

## 5. Decisions

**D1. A separate webhook subscription and endpoint for bookings.**
Channex allows several webhooks per property, each with its own URL and event mask (confirmed on the staging property). Bookings go to `/webhooks/channex/bookings`; messages go to `/webhooks/channex` (#3447). Each feature owns its endpoint and neither blocks the other. Rejected: one endpoint routing by event type (couples the inbox and booking import in one controller) and waiting for #3447 (puts the certification date on another timeline).

**D2. The route lives outside `/integrations/channex/...`.**
That path carries the Cognito authorizer, and Channex has no Cognito token, so API Gateway would reject every call. The new resource has no authorizer; the secret header is the authentication.

**D3. The route is served by the `ChannelManagement` Lambda.**
It runs the shared channel handler (`ChannelManagement/index.js`), has no messaging routes, and already reads Channex credentials. #3447 matches its route with a substring check on `/webhooks/channex`, which would catch this path inside `UnifiedMessaging`; a separate Lambda avoids that entirely. It is also the target of the planned route migration (#3149 runbook). Cost: one API Gateway invoke permission, scoped to this route. Rejected: `UnifiedMessaging` (relies on handler order to stay out of #3447's route, and adds booking traffic to the messaging Lambda).

**D4. The shared secret is stored in Secrets Manager, cached for 5 minutes per Lambda instance.**
Name `domits/channex/webhook/bookings`, separate from the messaging webhook's secret, so one leak does not expose the other. The 5-minute cache avoids a Secrets Manager call per request while letting a rotated secret take effect within 5 minutes. The header `X-Channex-Webhook-Secret` is compared by hashing both values with SHA-256 and comparing the hashes with `crypto.timingSafeEqual`: constant time, always 32 bytes, so a header of a different length cannot throw. Channex webhooks have no built-in signature (Channex documentation, "Webhook Security"). Rejected: a Lambda environment variable (readable in plain text by anyone who can read the function configuration, and rotation needs a configuration change) and a plain `===` comparison (leaks timing).

**D5. The webhook is a trigger to pull the property's feed, not a carrier of booking data.**
The payload is used only for `property_id` and the event type. Rejected: fetching only the revision in the payload (a modification can arrive before the new booking it modifies, and a missed webhook is never caught up).

**D6. Only an ACTIVE Channex mapping counts.**
A new repository method finds the mapping by Channex property id with the same condition the ARI outbox uses: `UPPER(p.status) = 'ACTIVE' AND UPPER(a.channel) = 'CHANNEX'`. Rejected: the lookup in #3447, which filters on neither status nor channel and returns an arbitrary row when an old inactive mapping shares the Channex id.

**D7. When the lock is taken, answer 503.**
The running pull may have read the feed before this booking arrived. Channex retries the first time after one minute. The lock expires after the same 5 minutes as the polling lock, from the same constant (`utils/channexBookingPollUtils.js:7`): both use one key, and with different limits the side with the shorter limit could take over a lock that is still legitimately held. Accepted consequence: if a Lambda is killed before it releases the lock, webhooks for that property answer 503 for up to 5 minutes, and the booking arrives through the retries after about 7 minutes. Rejected: 200 (the booking can stay unprocessed until the next trigger) and waiting for the lock (holds the request inside API Gateway's 29-second limit).

**D8. Only temporary failures return 5xx.**
Channex retries a 5xx at most 11 times, waiting 1, 2, 4, 8, 15 and 30 minutes, then 1, 2, 4, 6 and 10 hours, so the last attempt comes about 24 hours after the event (Channex documentation, "Webhook repeat logic"). It treats 2xx and 4xx as delivered. An unacknowledged revision stays in the feed, and every later webhook pulls it again. If a permanent failure returned 5xx, one bad revision would make every webhook for that property fail. So temporary failures (database conflict or connection, Channex 5xx, 429 or network, lock taken, secret unreadable, time budget reached) return 503, and everything else returns 200 with the revision left unacknowledged and recorded in the sync evidence. For a single revision whose failure is unclear, the answer is 200: the feed and Channex's `non_acked_booking` warning after 30 minutes are the safety net. A *thrown* error is different: failing revisions are caught inside the pull and never throw, so a thrown error is infrastructure (for example a database connection that cannot be opened, which surfaces without an error code) and answers 503, with its name, message and code logged (review of #3456).

**D9. The pull stops after a time budget of 20 seconds.**
API Gateway gives up after 29 seconds. The first webhook after a long period without polling may find a backlog. `collectPulledChannexBookingImports` gets an optional deadline; past it, the loop stops before the next revision, the rest stays in the feed, and the webhook returns 503 so Channex retries. Without the option, polling and the manual pull behave exactly as before. The ARI outbox worker uses the same approach (`channexAriOutboxWorker.js:262`).

**D10. The feed and acknowledgement results carry the HTTP status.**
Today both map every failure except 401 to one provider status (`providers/channex/providerClient.js:793`, `:948`), and the status number only survives in a fallback error code that Channex's own error code overrides. D8 needs to tell a 429 or 5xx from a 4xx, so both results get an `httpStatus` field (`null` for a network error). The field is additive; existing callers ignore it. Rejected: treating every non-401 failure as temporary, because one revision Channex refuses to acknowledge would then make every webhook for the property answer 503.

**D11. The shared handler admits exactly one unauthenticated webhook route.**
The handler returns early for any path outside `/integrations/channex|holidu` (`handler/channelManagementHandler.js:98-99`, `:282-288`). It now also admits `POST` on a path ending in `/webhooks/channex/bookings`, matched with `endsWith`, never `includes`, so #3447's `/webhooks/channex` is not caught. The route sits in a list of secret-header routes next to the internal-token routes and skips the Cognito check. The secret check is the controller's first step, before the body is read. Rejected: catching the route in `ChannelManagement/index.js` (splits the routing over two places and hides the route from anyone reading the handler).

**D12. A rejected secret is logged as an error.**
Channex treats a 401 as delivered and does not retry. If the secret in Channex and in Secrets Manager do not match, every webhook is rejected and no booking arrives, with Channex's `non_acked_booking` email as the only other symptom. Each 401 is logged at error level with the request id and source IP, never the header value. The live test includes one call with a wrong header.

**D13. The feed is read in pages of 100, and more pages answer 503.**
The Channex API reference says most list endpoints return 10 items unless `pagination[limit]` is set (maximum 100). A call to the staging feed on 6 October confirmed it: `meta` was `{ total, limit: 10, page, order_by: inserted_at, order_direction: asc }`. The feed call now asks for 100, and the webhook reads page after page within its time budget. Acknowledged revisions leave the feed and unacknowledged ones stay at its front (oldest first), so with N unacknowledged revisions the next unseen one is on page `floor(N / 100) + 1`; revisions already seen in this pull are skipped. This keeps the order and still reaches bookings behind a full page of revisions that keep failing (review of #3456). The loop ends when a page brings no unseen revision, so it cannot run forever. If a later page cannot be read, the webhook answers 503 (`MORE_PAGES`) and Channex's retry continues there.

Progress past failing revisions also has to survive the time budget: if every delivery retried the same failing revisions from the start of the feed, a booking behind more of them than fit in 20 seconds would never be reached (review of #3456). A revision that fails permanently is therefore stored with acknowledgement state `IMPORT_FAILED`, and the webhook skips it for 10 minutes; it stays in the feed, counts as unacknowledged, and is retried after that. A temporary failure goes back to `RECEIVED`, so Channex's next delivery retries it at once. The state column is free text and only `ACKNOWLEDGED` is checked elsewhere, so no migration is needed. Polling and the manual pull neither skip nor record. The webhook also logs `meta`, which holds only paging fields (booking details carry their own nested `meta`, which is not read). Accepted consequence: polling and the manual pull also read up to 100 revisions per call instead of 10, so a manual pull over a large backlog can take longer than API Gateway's 29 seconds; the work still completes in the Lambda.

## 6. Flow

```
Channex (property webhook, event "booking", header X-Channex-Webhook-Secret)
   │ POST /webhooks/channex/bookings        API Gateway, no authorizer
   ▼
ChannelManagement Lambda ── channelManagementHandler
   │    entry filter admits POST …/webhooks/channex/bookings (endsWith); route skips the Cognito check (D11)
   ▼
Controller
   │ 1. secret header vs Secrets Manager, 5-min cache (SHA-256 + timingSafeEqual) ── wrong or missing ─▶ 401, error log
   │ 2. body: event type and property_id ── no property_id ─▶ 400 ── not a booking event ─▶ 200 ignored
   ▼
Service
   │ 3. ACTIVE Channex mapping for property_id ── none ─▶ 200 PROPERTY_NOT_MAPPED
   │ 4. account's Channex credentials ── unreadable ─▶ 503
   │ 5. lock booking_poll:<domitsPropertyId> ── taken ─▶ 503
   │ 6. existing pull, trigger WEBHOOK, deadline 20 s: feed ▶ store ▶ acknowledge, per revision
   │ 7. release the lock (finally)
   │ 8. classify the result (section 7)
   ▼
200 or 503
```

## 7. Responses

| Situation | Response | Kind |
|---|---|---|
| Secret header missing or wrong | 401, nothing read, error log (D12) | permanent |
| Webhook secret cannot be read from Secrets Manager | 503 | temporary |
| Body is not JSON, or has no `property_id` | 400 | permanent |
| Event is not a booking event | 200, ignored | — |
| No ACTIVE Channex mapping for the property | 200, `PROPERTY_NOT_MAPPED`, logged | permanent |
| No account, or the account is disconnected | 200, `INTEGRATION_NOT_CONNECTED` | permanent |
| Account credentials cannot be read | 503 | temporary |
| Account credentials incomplete (no API key) | 200, `CREDENTIALS_INVALID` | permanent |
| Lock taken | 503 | temporary |
| Feed call: Channex 5xx, 429 or network error | 503 | temporary |
| Feed call: Channex 401 | 200; `lastErrorCode = CHANNEX_BOOKING_FEED_UNAUTHORIZED` on the account; error log | permanent |
| Feed call: other Channex 4xx | 200, recorded | permanent |
| A revision fails with a database conflict (`40001`, `OC001`) or connection error | 503 | temporary |
| A revision is stored but the acknowledgement fails with a Channex 5xx, 429 or network error | 503; the retry reuses the stored booking | temporary |
| A revision fails for any other reason (missing link, validation, Channex 4xx on acknowledge) | 200, revision not acknowledged, recorded in the evidence | permanent |
| Time budget reached before all revisions | 503; the rest is processed on the retry | temporary |
| A revision fails for an unknown reason | 200, revision not acknowledged, recorded in the evidence | treated as permanent |
| Anything throws (database, AWS, lock) | 503, error logged with name, message and code | temporary |
| Every revision stored and acknowledged | 200 | — |

The mapping from pull result to status is one pure function, tested on its own. It decides on the `httpStatus` of the feed and acknowledgement results (D10), not on error codes.

Each webhook writes one structured log line: request id, Channex property id, Domits property id, fetched, acknowledged and unacknowledged counts, the feed's `meta` (D13), outcome and status code. It never logs the header, the secret or guest data. The sync evidence written by the pull records the trigger as `WEBHOOK`.

## 8. Infrastructure prerequisites

All done by hand; none of it is in the repository.

1. Secrets Manager: create `domits/channex/webhook/bookings` as JSON, `{"webhookSecret": "<long random value>"}`, the same JSON format as the other integration secrets. A plain-text value or a missing key counts as not configured and makes the webhook answer 503. The `ChannelManagement` role can already read it (`ManageChannelSecrets` covers it).
2. API Gateway `54s3llwby8`: resource `/webhooks/channex/bookings`, method `POST` without an authorizer, Lambda proxy integration to `ChannelManagement`, then deploy stage `default`. `/webhooks` and `/webhooks/channex` may already exist for #3447.
3. Lambda permission: allow `apigateway.amazonaws.com` to invoke `ChannelManagement`, with the source ARN limited to `54s3llwby8/*/POST/webhooks/channex/bookings`. The function today only allows the ARI outbox EventBridge rule.
4. Channex staging: create a property webhook for the mapped staging property with the callback URL, event `booking`, and the header `X-Channex-Webhook-Secret`. Deactivate the two unused booking webhooks on that property (Mews and Apaleo staging URLs; no deliveries, not referenced anywhere in the repository).

Rollback: deactivate the webhook in Channex. Nothing else depends on the route.

## 9. Edge cases

| Case | What happens |
|---|---|
| a. The same webhook arrives twice | The second pull finds the revision already acknowledged (not in the feed) or reuses the stored booking |
| b. The modification arrives before the new booking | The feed is oldest first, so the new revision is stored first |
| c. A webhook and a poll at the same time | The shared lock lets one run; the other answers 503 (webhook) or skips (poll) |
| d. A manual pull from the admin panel during webhooks | The manual pull takes no lock. Follow-up; until then, do not use it while webhooks arrive |
| e. One revision can never be stored | It stays unacknowledged in the feed; the others are stored; the webhook answers 200; Channex sends `non_acked_booking` after 30 minutes |
| f. The Channex API key stops working | Feed returns 401; `lastErrorCode` is set on the account and logged |
| g. A large backlog after a long time without polling | The time budget stops the pull; 503; Channex retries and the next pull continues |
| h. The property is unmapped or the mapping is inactive | 200, nothing pulled |
| i. The secret in Channex does not match | Every webhook answers 401 and is logged as an error (D12); found in the live test |
| j. The secret is rotated | Warm instances accept the new secret within 5 minutes (D4) |
| k. A Lambda is killed while holding the lock | Webhooks for that property answer 503 for up to 5 minutes; the bookings arrive through Channex's retries (D7) |
| l. More than 100 revisions are waiting | The webhook reads the next pages within its budget; a full page of failing revisions does not hide the ones behind it (D13) |

## 10. Testing

Test-first, one commit per green step:

1. Repository: the ACTIVE Channex mapping is returned; inactive rows and other channels are ignored; an unknown id gives `null`.
2. Provider: the feed and acknowledgement results carry `httpStatus` for 401, 429, 4xx and 5xx, `null` for a network error; the feed result carries `meta`; existing provider tests stay green.
3. Secret check: the right header passes; a wrong, missing or different-length header gives 401 without throwing and logs an error; the header name is case-insensitive; Secrets Manager is read once per 5 minutes; a read failure gives 503.
4. Pull deadline: with a deadline, the loop stops before the next revision; without it, existing pull and poll tests stay green.
5. Result classification (pure function): every row of the table in section 7.
6. Service: unmapped gives 200 without a pull; lock taken gives 503 without a pull; the lock uses the polling key and stale limit; the pull gets `trigger: "WEBHOOK"` and the deadline; the lock is released after an error; a feed 401 sets `lastErrorCode`; with five revisions where the second fails permanently, the other four are acknowledged; re-processing a stored and modified or cancelled revision gives the same booking.
7. Handler: the webhook route runs without Cognito claims, and without the secret it answers 401 with nothing called; `GET` on the same path is not found; `POST /integrations/channex/bookings/pull` without claims still answers 401; `POST /webhooks/channex` is not handled by the channel handler; a non-booking event gives 200; a missing `property_id` gives 400.

Live test on Channex staging after deployment: a new, a modified and a cancelled booking on the test channel, each delivered (Channex webhook activity), stored once in Domits, and acknowledged. One call with a wrong secret answers 401 and appears in the error log. The log line's `meta` shows whether the feed is paginated (D13).

## 11. What this unlocks for certification

- The webhook and acknowledgement flow Channex lists as a requirement.
- Scenario 11 (new, modified and cancelled booking) without a manual pull.
- Availability on the other channels follows, because a stored booking enqueues an ARI change through the outbox (#3278).

## 12. Follow-ups

- Take the polling lock in the manual pull as well (edge case d).
- A revision already marked acknowledged in Domits is not acknowledged at Channex again. If the two ever disagree, it stays in the Channex feed and the webhook's page calculation (D13) starts one page early; it then stops when it sees nothing new, so it cannot loop, but later revisions wait for the next webhook.
- Readiness counts inactive mappings (`channexMappingService.js:623-639`).
- Polling as a low-frequency backup, after the review.
- A global webhook instead of one per property, when more hosts connect.