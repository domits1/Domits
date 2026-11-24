# Local preview for attachment chips: engineering review

Branch: `fix/767-attachment-local-preview` (from `origin/feat/767-attach-chips`)
Reviewed: the staged diff for the first frontend commit (5 files, code and tests plus this record)
Context: PR #3947 makes the backend return signed attachment URLs. The URL that the upload Lambda returns (`response.fileUrl`) points to the same private bucket, so the chip and the preview card showed a broken image right after upload.

## Decision

The uploader keeps a local preview of an image next to its uploaded URL and reports both:

```
drop / pick a file ──▶ upload ──▶ onUploadComplete({ url, name, type, previewUrl })
                                      url        the uploaded file url, the only one ever sent to the backend
                                      previewUrl URL.createObjectURL(file), for display only (images only, else null)
```

- A preview is created only for `image/*` files, and only after the upload succeeded and the uploader is still mounted. A failed upload, or an upload that finishes after the host switched thread, creates nothing, so there is nothing to leak.
- If the browser cannot create object URLs, `previewUrl` is `null` and the chip shows `url` as before.
- `ChatScreen` owns the blob URLs once it has them. It revokes a chip's preview when the chip is removed, when the thread changes, when the chat unmounts and when the composer is cleared after a send. The uploader does not revoke: a chip must outlive the uploader that created it only until one of those events, and one owner keeps the rule simple.
- The chip and the preview card show `previewUrl || url`. What is sent is unchanged: `uploadedFileUrls` is still built from `url`, and a test pins that a blob URL is never sent.
- Options weighed: create the preview in `ChatScreen` when it receives the upload result (it does not have the `File`), or in the uploader and hand it over (chosen).
- Consequence accepted: until the next commit, the sent message still shows the raw URL, and the blob is revoked when the message is sent.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `chatUploadAttachment.js` (`setFiles((prev) => [...prev, uploadedFile]);`): the uploader's own `files` state now also holds `previewUrl`. Nothing reads that state. | 8/10 | Accepted; the state was already unused. |
| `[P3]` `ChatScreen.jsx` (`const attachmentsRef = useRef(attachments); attachmentsRef.current = attachments;`): a ref written during render, the same pattern as in `MessageToast` (see `2026-11-12-767-toast-auto-close.md`). | 5/10 | Accepted. |
| `[P3]` `ChatScreen.jsx` (`releasePreview` calls `URL.revokeObjectURL`): not guarded for browsers without it. Every browser that has `createObjectURL` has `revokeObjectURL`, and previews exist only where `createObjectURL` does. | 7/10 | Accepted. |
| Only images get a preview. A video attachment still shows no thumbnail in the chip (it shows the file icon) and, until the signed URL arrives, no preview in the sent message. | n/a | Intended: `ChatMessage` decides on `.mp4` in the URL, which a blob URL does not have. |

## Not in scope

- The sender's own message after sending: next commit.
- The recipient's live message: the commit after that.
- Re-signing URLs in a chat left open for more than an hour.

## What already exists

- `{ url, name, type }` from `onUploadComplete` and the chips from `2026-11-12-767-attach-button-step-3.md`.
- The `mountedRef` guard in the uploader, which also keeps a late upload from creating a preview.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Image upload succeeds | Chip shows a blocked URL | Yes | Chip and card use `previewUrl` | The photo |
| Chip removed | Blob stays in memory | Yes | Revoked on remove, only that chip's | Nothing |
| Host opens another thread | Blobs of the dropped chips stay | Yes | Revoked in the effect cleanup | Nothing |
| Chat unmounts | Blobs stay | Yes | Same cleanup | Nothing |
| Message sent | Blobs stay | Yes | `clearComposer` revokes | Nothing |
| Upload fails or finishes after unmount | Blob created for nothing | Yes | No preview is created | Failure toast, or nothing |
| Non-image file | Blob created for nothing | Yes | `previewUrl` is `null` | File icon and name |
| Blob URL reaches the backend | Broken attachment | Yes | Only `url` is sent | n/a |

## Verification

New tests were red first (the report lacked `previewUrl`; the chip, the card and every revoke path were missing). Messages tests: 18 suites, 224 tests passed. Full web suite with `--testTimeout=30000`: 269 suites and 3573 tests passed, 6 suites skipped.
