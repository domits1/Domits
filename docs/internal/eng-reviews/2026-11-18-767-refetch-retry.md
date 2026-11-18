# Refetch retry for live attachment messages: engineering review

Branch: `fix/767-attachment-local-preview` (PR #3948, after a reviewer asked for changes)
Reviewed: three staged diffs, one section each below. This record grows with each commit.

## Commit 1: retry the live-attachment refetch

Reviewed: the staged diff (`useFetchMessages.js`, `useFetchMessages.test.js`, this record)

### Decision

The effect that refetches a thread when a live message with an attachment arrives marked the message id as done before the request ran, and `refreshThread` swallowed every failure. A failed or timed-out request, or rows that did not contain the message yet, were never tried again, so the recipient kept the raw private URL, which does not load.

```
live message with attachment ──▶ pending (no second loop for the same id)
        │
        ▼
 attempt 0 ──▶ { ok, complete }   ok: request succeeded and rows stored
        │                         complete: every expected id is in the rows
        ├─ ok && complete ──────────────▶ done
        ├─ else, retries left ─ wait 1s, 3s, 6s ─▶ next attempt
        └─ else, no retries left ───────▶ done (gives up)
unmount ──▶ clear timers, abort requests, no state is set afterwards
```

- `refreshThread(partnerId, threadId, expectedIds)` returns `{ ok, complete }` and still never throws.
- `refreshWithRetry` makes the first try and up to three retries after 1s, 3s and 6s: at most 4 requests. An id moves from pending to done only on success or after the last attempt.
- Ids of one thread that arrive together share one loop. A message that is pending, or done, starts nothing new.
- An unmount effect clears every timer, aborts every in-flight request and clears the pending ids. After that nothing is fetched and no state is set.
- Options weighed: retry forever or until the thread is opened again (rejected, it keeps a hidden loop alive), one retry (rejected, a deploy or cold start takes longer than a few seconds), a bounded backoff of three retries (chosen, as the reviewer suggested).
- Consequence accepted: a message that never shows up in the rows within about 10 seconds keeps its raw URL. The next commit covers that case when the image fails to load.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `useFetchMessages.js` (`complete: expectedIds.every(...)`): a live message without a server id gets a synthesized id that is never in the rows, so it uses all 4 requests. | 7/10 | Accepted. Bounded; WebSocket messages normally carry an id. |
| `[P3]` `useFetchMessages.js` (unmount effect): pending ids are cleared, so a StrictMode remount does not restart a loop that was cancelled. | 6/10 | Accepted. Only affects development double mounts. |
| `[P3]` Retries fetch the whole thread each time, as the first refetch did. | 8/10 | Accepted. At most 4 requests per message. |

### Not in scope

- A refetch when an image fails to load (commit 2).
- A server push that carries the signed URL (the WebSocket Lambda is not in this repo).
- Paging of the thread rows.

### What already exists

- `refreshThread`, `storeHistory` and the `wsRefreshedRef` guard. They are reused.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Refetch returns 500 or times out | Raw URL kept for good | Yes | Retry after 1s, 3s, 6s | The image, once a retry works |
| Rows do not have the message yet | Same | Yes | Same | Same |
| Every attempt fails | Endless loop | Yes | Stops after 4 requests | Raw URL (broken image) |
| Same message pushed again while waiting | Two loops | Yes | Pending set | No extra requests |
| Chat closed during the wait | Fetch or state update after unmount | Yes | Timers cleared, request aborted | Nothing |

### Verification

New tests were red first (6 of the 33 in `useFetchMessages.test.js` failed). They use fake timers: retry after a failed request, retry when the message is missing from the rows, exact 1s/3s/6s spacing, stop after the first try plus three retries, no retry after success, no second loop, no new loop after the limit, no fetch after unmount, abort of a running request. Full web suite with `--testTimeout=30000`: 270 suites and 3607 tests passed, 6 suites and 47 tests skipped.

## Commit 2: refetch once when an attachment image fails to load

Reviewed: the staged diff (`ChatMessage.js`, `ChatScreen.jsx`, `useFetchMessages.js`, their tests, this record)

### Decision

Signed URLs last 1 hour. A chat that stays open longer shows broken images, because the store still holds the old URLs. The same happens when the retries of commit 1 gave up.

```
<img> onError ──▶ ChatMessage.onAttachmentError(message)   (skipped for blob: previews)
      │
      ▼
ChatScreen.handleAttachmentError ──▶ refreshAttachments(contact, thread, message id)
      │
      ├─ message id already used ──▶ nothing      (once per message)
      ├─ thread request in flight ─▶ nothing      (one request covers all its messages)
      └─ else ─▶ one request, no retry ─▶ store rows ─▶ fresh urls
```

- `refreshAttachments(partnerId, threadId, messageId)` in the hook runs at most once per message id, and a thread that is already being refreshed is not requested again. It makes a single request and never retries. A missing image, or one that fails again after the refresh, therefore costs one request and cannot loop.
- Fresh rows replace the old ones in the store, and the screen shows the store copy before a local copy of the same id.
- `ChatMessage` gets an optional `onAttachmentError` prop and ignores `blob:` sources, which are local previews.
- Options weighed: refetch on a timer before the hour is up (rejected, it fetches for threads nobody is looking at), refetch on every error (rejected, a missing image would loop), once per message id (chosen).
- Consequence accepted: if the single request fails, that image stays broken until the chat is reopened.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `useFetchMessages.js` (`refreshAttachments`): a message skipped because its thread is already being refreshed is marked as used. If that request fails, no second try happens. | 7/10 | Accepted. Bounded by design. |
| `[P3]` `ChatMessage.js`: only images report errors. A video whose link expired is not covered. | 8/10 | Accepted. Out of scope. |
| `[P3]` An image that is really missing costs one request per message the first time. | 8/10 | Accepted. |
| `ChatMessage` has one caller (`ChatScreen`). Without the prop nothing happens. | n/a | Checked. |

### Not in scope

- Expiry of videos, and refreshing before the hour is over.
- A server-side redirect that signs on demand.

### What already exists

- `refreshThread` from commit 1 and `storeHistory`, reused with an empty expected list.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Chat open for more than an hour | Broken images | Yes | One refetch per message | Images load again |
| Image really missing | Loop of requests | Yes | Once per message id | Broken image, no extra traffic |
| Many images fail together | Many requests | Yes | One request per thread | Same |
| Refetch fails | Retry storm | Yes | No retry | Broken image until reopened |
| Local preview fails | Needless refetch | Yes | `blob:` ignored | Nothing |

### Verification

New tests were red first (9 failed): the hook refetches and shows the fresh URL, asks once per message, makes one request for several messages of a thread, does not retry a failed refetch, does nothing without a message, thread or partner id; `ChatMessage` reports a failed image and ignores a `blob:` one; `ChatScreen` calls the hook with the contact, thread and message id. Full web suite with `--testTimeout=30000`: 270 suites and 3619 tests passed, 6 suites and 47 tests skipped.
