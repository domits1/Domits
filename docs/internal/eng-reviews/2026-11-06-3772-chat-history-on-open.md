# fix(messages): load the chat history on open and merge it with live messages (#3772)

Pull request: opened from `fix/3236-chat-history-on-open`
Issue: #3772
Reviewed commit: `294ee3576`
Result: 3 blocking, all fixed before commit

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `useFetchMessages.js:328` | The merge only dropped live ids, so opening thread B of the same guest kept thread A's history in the guest's message list. | Fixed in `294ee3576`: history ids are remembered too, so the next fetch replaces them |
| P2 (9/10) | `useFetchMessages.js:265` | A booking or guest key was marked as loaded, so reopening booking A after booking B skipped the fetch and showed B's messages. | Fixed in `294ee3576`: only thread ids are marked as loaded, and opens without a thread id always fetch |
| P2 (8/10) | `useFetchMessages.js:289` | When a booking had no thread yet, the guest's list kept another booking's messages. | Fixed in `294ee3576`: only messages without a thread id are kept |
| P2 (7/10) | `whatsappService.js:148` | WhatsApp pushes carry no stored id, so a WhatsApp message saved before the history request but pushed after it can show twice. | Accepted for a follow-up: not a regression, because the old fetch replaced the list and had the same race |
| P3 (6/10) | `publishRealtimeMessage.js:21` | A message without an id was sent to the websocket Lambda as `id: null`, a value the Lambda never received before. | Fixed in `05a91146c`: the id is left out when there is none |
| P3 (6/10) | `messageService.js:588` | `...message` now also sends the stored id for Domits messages, because the publisher no longer drops it. | Accepted: the frontend dedupes by id, so the backend push and the browser's own send now merge |
| P3 (6/10) | `channexWebhookService.js:145` | A message without a platformMessageId is never pushed. | Accepted: the Channex normalizer rejects a payload without `payload.id`, so this cannot happen today |
| P3 (5/10) | `useFetchMessages.js:282` | Two quick opens without a thread id: the slower `/threads` answer sets the active thread. | Not in scope: the code had this before this change |
| P3 (4/10) | `useFetchMessages.js:328` | The remembered history ids grow with each chat opened in a session. | Accepted: small, and cleared on reload |

## What already exists

- `upsertIntoStores` already dedupes live messages by id, and the merge reuses that id.
- `createMessage` already returns the stored row with its id, so `createMessageIfNotExists` now returns that row instead of `true`.
- The `insertedMessages > 0` guard in the Channex webhook stays; publishing now also skips messages that were not inserted.

## Failure modes

| Path | Failure | Test | Handling | What the host sees |
|---|---|---|---|---|
| History fetch | 500 or network error | yes | live messages kept, not marked as loaded | the live messages, then the history on the next open |
| Thread lookup | no thread for the booking | yes | only threadless live messages kept | an empty chat or the new live messages |
| Push during the fetch | arrives mid-request | yes | kept by the merge | no lost message |
| Same message live and in history | both arrive | yes | merged by id | shown once |
| Realtime publish | Lambda error | yes | logged, webhook still returns 200 | the message on the next load |

## Not in scope

- WhatsApp stored ids in pushes: a follow-up.
- The websocket Lambda: its source is not in this repository, so passing `id` through it cannot be checked here.
- `HostListings.moderation.test.js` fails on `acceptance` with `fetchLiveEligibility is not a function`. It fails the same way without this change.
