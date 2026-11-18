# Extract storeHistory from useFetchMessages: engineering review

Branch: `fix/767-attachment-local-preview`
Reviewed: the staged diff for a refactor commit (1 file, no behaviour change, plus this record)
Why now: the next commit refetches a thread when a live message with attachments arrives. That refetch has to put a fetched history into the same two stores as the open flow. CLAUDE.md asks for refactors in their own commit, so the extraction comes first and the behaviour change reads as a small diff after it.

## Decision

The block that turns a fetched list into history and merges it into `messagesByRecipient` and `messagesByThread` moves, unchanged, from `fetchMessages` into `storeHistory(recipientId, threadId, rows, recordedIds)`. `fetchMessages` calls it where the block used to be.

```
fetchMessages ──▶ GET /messages ──▶ storeHistory ──▶ merge into both stores, remember ids, mark the thread loaded
(next commit) refreshThread ──▶ GET /messages ──▶ storeHistory
```

- No line of logic changed: the same transform, the same merge, the same `rememberId` calls, the same `historyLoadedRef.current.add`.
- `fetchMessages` still uses `userId` (to resolve the thread), so its dependency list is now `[storeHistory, userId]`. `rememberId` is no longer used there.
- Options weighed: add a refresh mode to `fetchMessages` (it already mixes loading state, the active thread, thread resolution and the "already loaded" shortcut, and every one of them would need an `isRefresh` branch), or extract the shared part and keep the refetch separate (chosen).

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `useFetchMessages.js` (`[storeHistory, userId]`): my first version of the dependency list left `userId` out, which would have given `fetchMessages` a stale `userId` if the user changed. Found while reviewing the diff. | 9/10 | Fixed before the commit. |
| No finding about behaviour: the moved block is identical. | n/a | Existing tests cover it. |

## Not in scope

- The refetch itself: next commit.
- Merging `webSocketContext.js` and `useFetchMessages.js`, which each carry their own copy of the attachment url extraction.

## What already exists

- The 12 tests of `useFetchMessages.test.js` that cover the open flow, the merge with live messages and the "already loaded" shortcut. They are the safety net for this refactor.

## Failure modes

No new code path. A mistake in the move would show in the open flow, which the existing tests exercise (history merge, live messages during a fetch, two identical messages, a failed fetch).

## Verification

Messages tests: 19 suites, 239 tests passed, the same as before the change. Full web suite with `--testTimeout=30000`: 270 suites and 3588 tests passed, 6 suites skipped.
