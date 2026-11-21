# Chat attach button, step 1: engineering review

Branch: `feat/767-attach-button`
Reviewed: the staged diff for commit `77870ebc6` (5 files, +122 -8)
Scope of the change: paperclip icon, placement in the message row, ref instead of `document.getElementById`. Upload logic untouched.

## Verdict

No blocking finding. Every finding below is non-blocking.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `ChatScreen.jsx:428-430`: the button now sits inside `.message-input-wrapper` for every screen that renders `ChatScreen` (`GuestMessages.jsx:142`, `HostMessages.jsx:59`, `bookingContainer.js`). Where `hostChatScreen.scss:383-395` applies (`height: 36px; border: solid $color-black 1px; box-shadow: -2px 3px 5px ...`) the button may render as a bordered box inside the pill. | 5/10 | Not verified in those screens. The new rules in `messagesV2.scss` use `.messages-v2 .chat-input .message-input-wrapper .add-attachment button.add-file-button` so they win inside `.messages-v2`. `hostChatScreen.scss` was left untouched on purpose. Check the old guest screen visually when it is next touched. |

## Not in scope

- Upload progress, disabled state and error feedback: step 2. `chatUploadAttachment.js:31-34` and `:47-48` only `console.error`, so a failed upload is invisible to the user. This is a critical gap carried over from before this change, and step 2 closes it.
- Only the first file is uploaded although the input has `multiple` (`chatUploadAttachment.js:28`, `const file = droppedFiles[0]`). Later step.
- The input value is never reset, so choosing the same file twice does not fire `onChange` (`chatUploadAttachment.js:62-67`). Later step.
- Editing `hostChatScreen.scss`: ruled out. That stylesheet reaches the old guest screen only; the host inbox uses `messagesV2.scss`. Context: CSS is global. Options: edit both files, or win by specificity in the one the host inbox uses. Choice: specificity in `messagesV2.scss`. Consequence accepted: two stylesheets still describe the same button until the old screen is retired.

## What already exists

- `@mdi/react` and `@mdi/js` were already used in `ChatMessage.js`; reused, no new dependency.
- The existing capability and CHANNEX condition in `ChatScreen.jsx` was moved as is, not rewritten.
- The existing `ChatScreen.test.js` mock of `chatUploadAttachment` was kept; the real component got its own test file.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Click with a null ref | `fileInputRef.current` is empty | No, the ref is always set once rendered | `?.click()` makes it a no-op | Nothing happens |
| Upload URL fetch or upload fails | Network error or non-2xx | No | `console.error` only | Nothing. Critical gap, pre-existing, step 2 |
| Capability missing or CHANNEX thread | Button must not render | Yes, both in `ChatScreen.test.js` | Conditional render | No button |

## Layout

```
.message-input-container
  .message-input-wrapper
    [ .add-attachment > button.add-file-button (44px) ]  <- moved here
    [ textarea.message-input-textarea ]
    [ button.message-input-send-button (44px) ]
.attachment-area
  [ inline-upload-preview ]   <- stays here
```

## Verification

Full web suite from `frontend/web`: 260 suites passed, 6 skipped, 3390 tests passed. New tests were red before the implementation. Checked in the browser by the author: placement, size, no black border or shadow.
