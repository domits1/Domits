# Chat attach button, step 3: attachment chips and preview card, engineering review

Branch: `feat/767-attach-button`
Reviewed: the staged diff for the code commit (6 files, +421 -28)
Scope of the change: each attachment is a chip above the message row (thumbnail or file icon with name, and a remove button), `onUploadComplete` passes `{ url, name, type }`, the popover is restyled as a card with a grid of image thumbnails, and the message row stays fully visible at 360px.

## Verdict

No blocking finding. Every finding below is non-blocking.

## Decisions

- New `AttachmentChip.js` in `features/hostdashboard/hostmessages/components`: it owns the one piece of local state (`imageFailed`), so a broken image falls back to the file chip without `ChatScreen` knowing.
- `ChatScreen` keeps `attachments` as the single list and derives the urls from it (`uploadedFileUrls`). Sending, the optimistic message and clearing therefore use the same urls as before.
- The popover keeps its role and lists only attachments whose type starts with `image/`. Escape and a labelled close button close it.
- All styles are scoped under `.messages-v2` in `messagesV2.scss`. `hostChatScreen.scss` is untouched.
- Narrow-width cause and fix: the textarea had `flex: 1` but no `min-width: 0`, so its intrinsic minimum width pushed the row wider than the pane and clipped the paperclip. `min-width: 0` on the container, row and textarea, and `flex-shrink: 0` on the send button, fix it.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `ChatScreen.jsx` (`imageAttachments` filters by type only): a broken image falls back on its chip but still shows broken in an open popover. | 6/10 | Accepted, as planned. |
| `[P3]` `AttachmentChip.js:11` and `key={attachment.url}` with removal by url: two attachments with the same `fileUrl` would be removed together; `aria-label` on a `<li>` is not announced by every screen reader. | 5/10 | Not verified that the upload endpoint always returns a unique url. Accepted. |
| `[P3]` `features/messages/GuestMessages.jsx` and `HostMessages.jsx` render `ChatScreen` outside `.messages-v2`, so the chips would be unstyled there. | 5/10 | Nothing imports those two files. `bookingContainer.js` wraps the chat in `.messages-v2`. No live regression. |
| `[P3]` `chatUploadAttachment.js` passes `response.fileUrl` unvalidated into a prop typed as required. | 3/10 | Appendix. |

## Not in scope

- Uploading more than the first selected file and resetting the file input: later work.
- Cleaning up `.inline-upload-preview`, `.more-badge` and the old `.preview-popover` rules in `hostChatScreen.scss`: that file serves unrouted screens and was left alone on purpose.
- Moving the failure toast to `react-toastify`: recorded in `2026-11-12-767-toast-auto-close.md`.

## What already exists

- `@mdi/react` icons (`mdiClose`, `mdiFileOutline`) and the `var(--border)` token, reused.
- The thread-change reset of the attachment list and the `key` on the uploader from the previous commits.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Image fails to load | Broken thumbnail | Yes | `onError` switches to the file chip | File icon and name |
| Non-image file | No thumbnail possible | Yes (PDF) | File chip, no preview button | Icon and name |
| Remove clicked | Wrong file removed | Yes | Removal by url, only that chip | Others stay |
| Send after a removal | Removed file still sent | Yes | Urls derived from the remaining list | Only the remaining files go |
| Every image removed while the popover is open | Empty dialog | Yes by construction (`isPreviewOpen` needs images) | Popover closes | Nothing open |
| Narrow pane | Paperclip clipped | No (CSS only) | `min-width: 0` | Checked by the author at 360px |
| Very long file name | Row stretches | No (CSS only) | Ellipsis at 180px | Shortened name |

## Layout

```
.chat-input (position: relative)
  .attachment-area
    ul.attachment-chips ── li.attachment-chip ── [thumbnail | icon + name] [✕]
  .message-input-container
    .message-input-wrapper  [📎] [textarea, min-width: 0] [send]
  .preview-popover (absolute, above the composer)
    header [title] [✕]   ul.preview-popover-grid ── li.preview-item ── img
```

## Verification

Full web suite from `frontend/web`: 261 suites passed, 6 skipped, 3417 tests passed. The new tests were red before the change (11 failing). Checked in the browser by the author at full width and at 360px.
