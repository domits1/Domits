# Message toast closes by itself: engineering review

Branch: `feat/767-attach-button`
Reviewed: the staged diff for the code commit (4 files, +142 -4)
Bug: the "Message failed to send" toast, and the upload failure toast added in step 2, stayed on screen forever. `ChatScreen` passed `onClose` to `MessageToast`, but the component ignored it and nothing else called `setShowToast(false)`.

## Decision

`MessageToast` takes an optional `onClose`. When it is given, the toast closes itself after 5 seconds and shows a close button (`aria-label="Close notification"`). Without `onClose` nothing changes, which keeps `features/guestdashboard/chat/Chat.js` working: it renders the component inside a `react-toastify` toast, which has its own timer and close handling.

- Options weighed: a timer in `ChatScreen` (keeps `MessageToast` dumb, but every future user of the component repeats it), or the timer in `MessageToast` (chosen).
- The timer reads the latest `onClose` through a ref. `ChatScreen` passes a new arrow function on every render, so a plain effect dependency would restart the 5 seconds on every keystroke and the toast would never close while the host types.
- Consequence accepted: the component now owns a timer, so a caller that passes `onClose` gets the 5 seconds whether it wants them or not.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `MessageToast.jsx` (`onCloseRef.current = onClose;` in the render body): writing a ref during render is discouraged under concurrent rendering. | 5/10 | Accepted; the app does not use concurrent features here. Follow-up if it ever does: move the write into an effect. |
| `[P3]` `MessageToast.jsx` (`}, [isClosable, message]);`): a second failure with the same text while the first toast is open keeps the first toast's clock. | 5/10 | Accepted. |
| Contrast of the close button (`#e5e5e5`) was not measured. | n/a | The author checked the toast in the browser. |

## Not in scope

- Moving the failure messages in `ChatScreen` to `react-toastify`. `MessageToast` was written as the body of a `react-toastify` toast, and `App.js` already mounts a `ToastContainer` with `autoClose={5000}`, so `toast.error(...)` would give the standard look, position and dismissal with no timer of our own. Today `ChatScreen` renders the component inline at the bottom of the chat, with the Domits logo and the name "Contact". Deferred on purpose: it changes how every send failure looks and needs a design decision. Later.
- Clearing the `error` state in `ChatScreen` when the toast closes: it only gates the toast and has no other reader.

## What already exists

- `ChatScreen` already passed `onClose={() => setShowToast(false)}`; no change was needed there.
- The 5000 ms matches the `autoClose` of the app's `ToastContainer`.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Toast with `onClose` | Never closes (the original bug) | Yes, closes at exactly 5000 ms and not before | Timer | Toast disappears |
| Close button | Clicked before 5 seconds | Yes | Calls `onClose` | Toast disappears |
| Parent re-renders with a new `onClose` | Timer restarts and the toast never closes | Yes | Ref holds the latest handler | Toast disappears on time |
| Component unmounts first | Timer fires into a gone component | Yes | Cleanup clears the timer | Nothing |
| Used without `onClose` (`Chat.js`) | Unwanted button or timer | Yes | Neither is rendered | Unchanged |
| A failure after a dismissed toast | Toast does not return | Yes (`ChatScreen.test.js`) | `setShowToast(true)` | Toast shows again |

## Lifecycle

```
mount with onClose ──▶ start 5000 ms timer ──▶ onClose()  (toast removed by the parent)
        │                    ▲
        │                    └── cleared on unmount or a new message text
        └── click ✕ ──▶ onClose()
```

## Verification

Full web suite from `frontend/web`: 261 suites passed, 6 skipped, 3404 tests passed. Three of the new `MessageToast` tests were red before the change. Checked in the browser by the author.
