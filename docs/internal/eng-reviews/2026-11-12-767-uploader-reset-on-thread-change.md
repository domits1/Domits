# Reset the uploader when the thread changes: engineering review

Branch: `feat/767-attach-button`
Reviewed: the staged diff for the code commit (4 files, +68 -4)
Origin: finding 2 of `2026-11-12-767-attach-button-step-2.md`. A slow upload that finishes after the host switches threads could add its file to the new thread.

## Why a key was not enough

A `key` remounts `ChatUploadAttachment` when the thread changes, but it does not cancel an upload that is already running. The old instance's `await` continues and then calls `onUploadComplete`, which is still wired to `ChatScreen`. The late file would still land in the new thread. The change has two parts:

1. `ChatScreen.jsx` keys the uploader by `${resolvedContactId}::${threadId || ""}`, so the host gets a fresh uploader per conversation.
2. `chatUploadAttachment.js` keeps a `mountedRef`. An unmounted uploader reports neither success nor failure and does not touch its state.

## Decision

- Key: `contactId::threadId` instead of `threadId` alone. The attachment reset effect (`ChatScreen.jsx:104-106`) resets on either value, and a new chat has no `threadId`, so `threadId` alone would not reset the uploader between two new chats.
- Options weighed for the guard: abort the request with an `AbortController` (also stops the transfer, but the upload URL request and the form post both need plumbing), or ignore the result after unmount (chosen, smaller).
- Consequence accepted: the file is still uploaded to storage. It is simply never attached to a conversation.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `chatUploadAttachment.js` (`if (!mountedRef.current) { return; }`): a finished upload is dropped silently whenever the uploader unmounts for a reason other than a thread switch (for example a platform change to CHANNEX). | 5/10 | Accepted. Rare, and the right outcome for the thread switch. |
| `[P3]` `ChatScreen.jsx` key: the same `contactId` and `threadId` pair is built in the reset effect and in the fetch key. | 4/10 | Deferred. A named helper is a refactor and belongs in its own commit. |

## Not in scope

- Cancelling the network transfer with `AbortController`: later, if large uploads become a cost concern.
- Showing the host that an upload was dropped after a thread switch.
- Storage cleanup of files that were uploaded but never attached.

## What already exists

- The attachment list is already cleared on a thread change (`ChatScreen.jsx:104-106`); this change makes the uploader itself follow the same boundary.
- `uploadingRef` already prevents two uploads at once; the new `mountedRef` follows the same ref pattern.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Upload finishes after the thread changed | File lands in the wrong thread | Yes, `chatUploadAttachment` test: not reported after unmount | `mountedRef` guard | Nothing is attached |
| Upload fails after the thread changed | Failure toast for a conversation the host left | Yes | Guard skips `onUploadError` | Nothing |
| Host switches threads | Old uploader state (busy spinner) shown in the new thread | Yes, `ChatScreen` test with a stateful uploader mock | Key remounts it | Fresh paperclip |
| Unmount for another reason | Completed upload dropped | No | Same guard | Nothing. See the first finding |

## Flow

```
upload starts in thread A ──▶ host opens thread B ──▶ key changes ──▶ uploader A unmounts
                                                                              │
upload A finishes ──▶ mountedRef is false ──▶ no onUploadComplete, no toast ◀─┘
```

## Verification

Full web suite from `frontend/web`: 261 suites passed, 6 skipped, 3407 tests passed. The three new tests were red before the change (two unmount cases, one key case).
