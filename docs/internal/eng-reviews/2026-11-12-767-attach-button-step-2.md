# Chat attach button, step 2: upload feedback, engineering review

Branch: `feat/767-attach-button`
Reviewed: the staged diff for the step 2 code commit (5 files, +191 -39)
Scope of the change: spinner on the paperclip while uploading, the button disabled during the upload, and a toast ("Attachment failed to upload") through a new `onUploadError` prop instead of `console.error`.

## Verdict

No blocking finding. Every finding below is non-blocking.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` `chatUploadAttachment.js`, `catch { onUploadError?.(); }`: the caught error is dropped, so the cause of a failed upload (HTTP status, network error) is not logged anywhere. | 6/10 | Accepted. The user sees a toast, so the failure is handled, but there is no diagnostic. Follow-up: pass the error to `onUploadError` or to the app's logging once the project settles how errors are reported on the web. |
| `[P2]` `ChatScreen.jsx:104-106` against `chatUploadAttachment.js` (`onUploadComplete(response.fileUrl)` after two awaits): the thread-change effect clears the attachments, but `ChatUploadAttachment` is not keyed by thread. A slow upload that finishes after the host switches threads could add its file to the new thread. The race exists before this change. | 6/10 | Not verified at runtime and not introduced by this diff. Follow-up: `key={threadId}` on `ChatUploadAttachment`, with a test that a late upload from the previous thread is not added. |
| `[P3]` An exception thrown inside `onUploadComplete` would show the "upload failed" toast even though the upload succeeded. | 4/10 | Appendix only. |

## Not in scope

- Auto-dismissing the toast: the toast never closes (`MessageToast` ignores `onClose`; nothing else calls `setShowToast(false)`). Decision: its own commit right after this one, with its own test.
- Uploading more than the first selected file, and resetting the input value so the same file can be chosen twice: unchanged, later step.
- The attachment preview: step 3.

## What already exists

- The `mdiLoading` icon and its `spin` prop come from `@mdi/react`, already a dependency; no spinner CSS was written.
- The failure toast reuses `setError`, `setToastText` and `setShowToast` in the same shape as `showSendFailedToast`.
- The upload sequence (get URL, build form data, post) moved unchanged into `uploadFile`, so the behaviour on success is the same.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Upload URL request fails | `getUploadUrl` throws on a non-OK response | Yes | `catch` calls `onUploadError`, `finally` restores the button | Toast, paperclip back |
| Upload URL response incomplete | no `uploadUrl` or `fields` | Yes | Throws, same handling | Toast |
| File transfer fails to connect | `fetch` rejects | Yes | Same | Toast |
| File transfer rejected | `uploadResponse.ok` is false | Yes | Same | Toast |
| Second file dropped during an upload | Two uploads race | Yes | `uploadingRef` ignores it | Nothing; the button is disabled |
| Thread switched during an upload | Late file lands in the new thread | No | None | Possibly a wrong attachment. See the second finding |

## State of the button

```
idle ──pick/drop──▶ uploading ──ok──▶ idle  (onUploadComplete)
                        │
                        └──any failure──▶ idle  (onUploadError ▶ toast)
uploading: disabled, aria-busy="true", mdiLoading spinning
```

## Verification

Full web suite from `frontend/web`: 260 suites passed, 6 skipped, 3398 tests passed. The new tests were red before the implementation (7 failing). Checked in the browser by the author.
