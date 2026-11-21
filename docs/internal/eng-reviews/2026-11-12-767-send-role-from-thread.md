# Send roles from the thread: engineering review

Branch: `fix/767-send-role-from-thread`
Reviewed: the staged diff for the code commit (3 files, +86 -2)
Bug: sending in an existing chat failed with 403 "hostId does not match the authorized conversation context" when the logged-in user is the guest of that thread but is on the host dashboard.

## Cause

`ChatScreen.jsx` chose `hostId` and `guestId` from `dashboardType` alone. `threadRepository.getThreadsForUser` returns threads where the user is host or guest, so on the host dashboard the user can be the guest of a thread. For a send with a `threadId`, `messageService.js` (`resolveExistingThreadMessageContext`) compares the payload ids with the thread's real ids through `assertConsistentOptionalId` and answers 403 on a mismatch.

## Decision

When the chat has a `threadId`, the client sends `hostId` and `guestId` as `null`. The backend already skips null (`assertConsistentOptionalId`) and fills both from the thread (`resolvedPayload.hostId = access.thread.hostId`). A chat without a `threadId` keeps today's dashboard-based ids.

- Options weighed: derive the roles on the client from the thread rows (needs the thread loaded, duplicates a backend rule), or leave them to the backend (chosen).
- Consequence accepted: the client no longer sends role ids for existing threads, so the backend thread record is the only source of truth.

## Retry paths

- Resend of a message that was never saved (`resendUnsavedMessage`) reuses `retryPayload.options`, which is the same `sendOptions` object, so the rule applies. Covered by a test.
- Retry of a saved message (`retrySavedMessage`) sends only the message id. Nothing to change.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` `messageService.js:320-321`: the fix relies on every stored thread having both `hostId` and `guestId`, because the backend copies them through. | 5/10 | Accepted. If an incomplete thread row exists, it already produces a bad message today. Follow-up: a data check on the threads table. |
| `[P3]` `useSendMessage.js:87-88`: the websocket payload carries null role ids for threads. `publishRealtimeMessage.js` does not read them; the receiving websocket Lambda is not in this repo. | 3/10 | Unverified. Appendix. |

## Not in scope

- Moving the role decision for new chats to the backend. A chat without a thread still needs the dashboard to say who is who.
- Other senders of messages: a search of `frontend/web/src/features/hostdashboard/hostmessages` hooks and services found no other place that derives roles from `dashboardType`.

## What already exists

- The backend already ignores null ids and resolves them from the thread; no backend code changed.
- Existing guest-dashboard and retry tests were kept and still pass.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Host-dashboard user who is the guest of the thread sends | 403 from the role mismatch | Yes (frontend, expects null ids) | Fixed | Message sends |
| Host-dashboard user who is the host sends | Must keep working | Yes | Null ids, backend fills | Message sends |
| New chat without a thread | Must still send the roles | Yes (characterization) | Dashboard ids as before | Message sends |
| Resend of an unsaved message in a thread | Would repeat the 403 | Yes | Same options object | Message sends |
| Client sends a wrong role id for a thread | Spoofing attempt | Yes (backend, new test) | 403 | Error |
| Thread row without a host or guest id | Bad message | No | None | Possibly wrong recipient. See the first finding |

## Decision flow

```
send with threadId? ──yes──▶ hostId = null, guestId = null ──▶ backend fills both from the thread
        │
        no
        ▼
hostId / guestId from dashboardType (unchanged)
```

## Verification

- Web suite from `frontend/web`: 261 suites passed, 6 skipped, 3433 tests passed. Four of the new tests were red before the change.
- Backend `functions/UnifiedMessaging`: 53 suites, 664 tests passed, including two new tests that pin the existing-thread contract (null roles accepted, wrong role rejected). Those two pass on the old code too.
- Full backend suite: 3 suites fail for environment reasons unrelated to this change. `test/General-Bookings-CRUD-Bookings-develop/lambdaRepository.test.js` and `test/PropertyHandler/builder-unit-unhappy-path.test.js` need AWS credentials. `test/PropertyHandler/end-to-end.test.js` needs a live database, and CI excludes it.
