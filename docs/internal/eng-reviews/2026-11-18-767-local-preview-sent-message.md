# Sender's own message keeps the local preview until the signed URL arrives: engineering review

Branch: `fix/767-attachment-local-preview`
Reviewed: the staged diff for the second frontend commit (5 files, code and tests plus this record)
Builds on: `2026-11-18-767-local-preview-chips.md`
Context: PR #3947 makes the backend return signed attachment URLs in the send response. The sender's own message was built from the raw uploaded URL, so its image was blocked right after sending.

## Decision

```
send ──▶ optimistic message shows previewUrl (blob)  ──▶ send response ──▶ settled message shows the signed url, blob revoked
         sendMessage gets only the uploaded urls            saved.attachments (array or JSON string)

failed send ─▶ message keeps the blob + a retryPayload with the uploaded urls only ─▶ Retry ─▶ same settle
```

- The optimistic message displays `previewUrl || url` for each attachment. What goes to the backend, and into the retry payload, is built from `url` only (`uploadedFileUrls`). A blob URL is never sent. The old code passed the optimistic message's `fileUrls` to `sendMessage`; that is split now.
- The blob URLs of a sent message move from the chips to the message. `ChatScreen` keeps them in a map keyed by the optimistic message id, and no longer revokes them when the composer is cleared.
- When the send response carries attachments, the settled message uses those signed URLs and the message's blobs are revoked. The same happens when a failed message is resent.
- If the response has no attachments (for example a failed send that was saved without them), the message keeps showing the blob and the blob is kept. A raw URL would show nothing, so the blob is the better image.
- Whatever is left in the map is revoked when the chat unmounts.
- `utils/extractFileUrls.js` reads the urls from an array or a JSON string, because the response can hold either. `useFetchMessages.js` and `webSocketContext.js` each have a private copy of the same function; I left them alone to keep this commit small.
- Options weighed: store the blob URLs on the message object (they would then travel into `handleContactListMessage` and `retryPayload`), or in a ref map keyed by message id (chosen).
- Consequence accepted: a message that never gets a signed URL holds its blob until the chat closes.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `ChatScreen.jsx` (`fileUrls: signedFileUrls.length > 0 ? signedFileUrls : pending.fileUrls,`): the settled message may keep a blob URL in `fileUrls`, which then reaches `handleContactListMessage`. The contact list only reads its length. | 8/10 | Accepted. |
| `[P3]` `ChatScreen.jsx` (`messagePreviewsRef.current.set(optimisticId, localPreviewUrls)`): the map entry of a failed message stays until it settles or the chat closes. | 8/10 | Accepted; bounded by the images sent in one session. |
| `[P3]` A message from the history or a websocket echo with the same id as the settled message wins over the local one in `mergedMessages` (`[...baseArr, ...visibleLocalMessages]` with the first seen id kept). If that copy holds a raw URL, the sender sees it again. | 6/10 | Addressed by the next commit, which refetches the thread when a live message with attachments arrives, whoever sent it. |
| Signed URLs expire after an hour. A chat left open longer shows a broken image until the next fetch. | n/a | Known and accepted since the backend review. |

## Not in scope

- The recipient's live message: next commit.
- Moving the two private `extractFileUrls` copies onto the new util.
- Re-signing after expiry.

## What already exists

- `buildSettledMessage`, which already merged the saved fields into the pending message. It now also takes the signed URLs.
- The retry payload for an unsaved message. It only had to hold the uploaded URLs.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Sent message while the server answers | Blocked raw URL | Yes | Shows the blob | The photo |
| Response with signed urls | Raw or blob stays | Yes (array and JSON string) | Uses the signed urls, revokes the blob | The photo |
| Response without attachments | Blob revoked while shown | Yes | Keeps the blob, no revoke | The photo |
| Failed send, then Retry | Blob sent to the backend, or lost | Yes | Retry sends the uploaded urls; the blob stays until the signed url arrives | The photo, then the signed photo |
| Chat closes with unsettled messages | Blobs stay | Yes | Revoked on unmount | Nothing |
| Chips cleared after sending | Blob revoked while the message shows it | Yes | Clearing no longer revokes | The photo |

## Verification

New tests were red first (five tests in `ChatScreen.test.js` and the missing util). A test of mine that claimed the chips clear while the server answers was wrong, because the composer is cleared after the response; I fixed the test, not the behaviour. Messages tests: 19 suites, 239 tests passed. Full web suite with `--testTimeout=30000`: 270 suites and 3588 tests passed, 6 suites skipped.
