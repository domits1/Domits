# Refetch the thread when a live message with attachments arrives: engineering review

Branch: `fix/767-attachment-local-preview`
Reviewed: the staged diff for the third frontend commit (3 files, code and tests plus this record)
Builds on: `2026-11-18-767-extract-store-history.md`
Context: for a DOMITS chat the browser relays `fileUrls` to the other participant over the websocket, and that Lambda is not in this repo (`useSendMessage.js` sends `fileUrls` through `sendWebSocketMessage`). The recipient's live message therefore carries the raw, blocked URL. The history endpoint returns signed URLs (PR #3947).

## Decision

When a live message with attachments and a thread id arrives, `useFetchMessages` refetches that thread and merges the answer over the stores, so the same message id now carries the signed URL.

```
websocket push { id, threadId, fileUrls: [raw] } ──▶ upsert into the stores (raw url, shown at once)
        └──▶ refreshThread(partner, threadId) ──▶ GET /messages?threadId=... ──▶ storeHistory
                                                      history wins for the same id, so the signed url replaces the raw one
```

- The refetch lives in `useFetchMessages`, not in `webSocketContext.js`. The context only receives and normalizes pushes; the token, the endpoint and the merge into the stores are in the hook, so the hook owns the refetch and `webSocketContext.js` is untouched.
- It runs for any live message that has attachments, whoever sent it. That also covers an echo of the sender's own message, which would otherwise win over the signed copy kept in `ChatScreen`.
- One refetch per thread per batch of pushes, and never twice for the same message id (`wsRefreshedRef`).
- The merge uses an empty `recordedIds` set. History replaces any stored message with the same id, and every other stored message stays, so a live message that the history does not hold yet (a lagging read) is not dropped.
- A failed refetch (non-OK response, network error, timeout after 10 seconds) is logged and ignored: the live message stays with its raw URL, no error state is set and nothing is shown to the user.
- A push without a thread id is not refetched. DOMITS pushes carry the saved thread id.
- It does not use the `fetchMessages` flow, so it does not change the open conversation, the loading flag or the error state.
- Options weighed: signing in the WebSocket Lambda (not in this repo), stopping the browser from relaying `fileUrls` (a larger change to the relay contract), or the refetch (chosen, as decided with the author).
- Consequence accepted: one extra GET per attachment message received.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` `useFetchMessages.js` (`storeHistory(partnerId, threadId, rows, new Set());`): a live message whose id was made up from its content (no `id` in the push) would show twice after the merge, once from the history and once from the push. DOMITS pushes with attachments carry `id: savedId`, and a push without an id means the save failed, so there is no history row either. | 6/10 | Accepted. |
| `[P3]` `useFetchMessages.js` (`wsRefreshedRef.current.add(normalized.id);` before the fetch): a failed refetch is not retried, so that message keeps its raw URL until the chat is reloaded. | 8/10 | Accepted. |
| `[P3]` Two refetches of the same thread can overlap when pushes arrive in different batches. They are idempotent merges by id. | 7/10 | Accepted. |
| `[P3]` `getIdToken()` is read on each refetch, as `fetchMessages` does when it has no `accessToken` option. | 8/10 | Accepted. |
| Signed URLs from a refetch also expire after an hour. | n/a | Known. |

## Corrections to earlier records

`2026-11-18-767-extract-store-history.md` said the refactor was covered by "the 12 tests of `useFetchMessages.test.js`". That file had 14 tests before this commit; it now has 24.

## Not in scope

- The websocket relay itself, and the WebSocket Lambda.
- WhatsApp and Channex pushes: their media has no URL on the frontend (`mediaId` only), and `publishRealtimeMessage` already signs.
- Moving the private `extractFileUrls` copies in `webSocketContext.js` and `useFetchMessages.js` onto the new util.

## What already exists

- `storeHistory`, extracted in the previous commit.
- The `domits:ws-message` pipeline and `wsSeenRef`, which this follows with its own seen set.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Live message with an attachment | Raw URL stays (403 image) | Yes | Refetch replaces it with the signed URL | The photo |
| Live message without attachments | Extra request | Yes | No refetch | Unchanged |
| Several pushes of one thread together | Several requests | Yes | One refetch per thread per batch | The photo |
| Later pushes after the first | Refetch repeats | Yes | One refetch per message id | Unchanged |
| History does not hold the message yet | Message disappears | Yes | Stored messages that are not in the history stay | The raw URL image until the next load |
| Refetch fails (HTTP error or network) | Error state or toast | Yes (both) | Logged, ignored | The raw URL image |
| Message of a thread that is not open | Open conversation changes | Yes | The refetch does not touch the active thread | Unchanged |
| Push without a thread id | Unusable request | Yes | Skipped | Unchanged |

## Verification

New tests were red first (eight of the ten in `useFetchMessages.test.js`; the two that expect no refetch passed before). `useFetchMessages.test.js`: 24 tests passed. Messages tests: 19 suites, 249 tests passed. Full web suite with `--testTimeout=30000`: 270 suites and 3598 tests passed, 6 suites skipped.
