# Image and video size in the host inbox chat: engineering review

Branch: `fix/767-attachment-local-preview`
Reviewed: the staged diff (`frontend/web/src/components/messages/messagesV2.scss`, this record)

## Decision

An image the host sends renders at its natural size in the host inbox, so the conversation panel gets both scrollbars and the image fills it. The host inbox is styled by `messagesV2.scss` (scoped under `.messages-v2`), and `ChatMessage.js` renders `.message-attachments`, `.message-image-button`, `.message-image`, `.message-video` and `.image-modal` / `.image-modal-content` (lines 97-151) for which that file has no rules. The only rules are in `hostChatScreen.scss:575-621`, nested under `.guest-chat`, so they do not apply here.

```
.messages-v2 .chat-body (scrolls)
  └─ .chat-message-row (flex)            min-width: 0
       └─ .chat-message (max 72%/640px)  min-width: 0
            └─ .message-attachments (flex, wrap, gap 8px, right for sent, left for received)
                 ├─ .message-image-button ─ .message-image  (max 240px x 240px, within the bubble)
                 └─ .message-video                          (same limits)
.image-modal (fixed, full screen, dark) ─ .image-modal-content (max 90vw x 90vh)
```

- Rules for the six classes are added to `messagesV2.scss` under `.messages-v2`, next to the message styles. Colours reuse the file's own values (`var(--domits-green)`, `#0f172a`, `#f1f5f9`); no new `rgba` backgrounds.
- Media is capped at `min(240px, 100%)` wide and `240px` high, rounded, `display: block`.
- `min-width: 0` is added to `.chat-message-row` and `.chat-message`, so a wide child can shrink instead of widening the flex item.
- `.chat-body` gets `overflow-x: hidden`. With only `overflow-y: auto` the browser computes `overflow-x` as `auto` too, which is where the horizontal bar came from.
- The lightbox is a solid `#0f172a` overlay. The component already closes it on click and on Escape.
- `hostChatScreen.scss` and the guest chat are not touched.
- Options weighed: fix it in `ChatMessage.js` with a size attribute (no, styling belongs in the stylesheet), or move the guest rules to a shared file (bigger change, touches the guest chat), or add the rules to `messagesV2.scss` (chosen).
- Consequence accepted: the media sizes now exist in two places, the guest chat and the host inbox.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `messagesV2.scss` (`.chat-body`, `overflow-x: hidden`): it clips anything that would still overflow sideways instead of showing it. | 8/10 | Accepted. It is a guard; the caps and `min-width: 0` are the real fix. |
| `[P3]` `.message-image` has no `width`/`height` attributes, so a slow image can shift the scroll position when it loads. | 6/10 | Accepted, as before this change. Out of scope. |
| `[P3]` `max-width: min(240px, 100%)` needs `min()` support. The same file already uses `min(72%, 640px)`. | 9/10 | Accepted. |
| The same class names exist in `hostBookingTab.scss` and `BookingTab.jsx`. | n/a | Checked: they are scoped to the booking tab and do not collide with `.messages-v2 .message-image`. |

## Not in scope

- Sharing one set of attachment rules between the guest chat and the host inbox.
- Reserving image space before load (aspect-ratio placeholders).
- Video formats other than the existing `video/mp4` source.

## What already exists

- The guest chat rules in `hostChatScreen.scss`, used as the reference for sizes and the lightbox.
- The lightbox state and the close handlers in `ChatMessage.js`.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Large image sent | Fills the panel, scrollbars | No (layout) | Capped at 240px | A thumbnail in the bubble |
| Very wide or tall image | Bubble grows sideways | No (layout) | `min-width: 0`, cap of 100% of the bubble | Fits the bubble |
| Long unbroken text | Panel scrolls sideways | No (layout) | `word-break` on content, `overflow-x: hidden` on the body | Wrapped text |
| Click on a thumbnail | No lightbox styling | Existing markup tests | Fixed dark overlay, image max 90vw/90vh | Enlarged image, click closes |
| Keyboard focus on a thumbnail | No focus indicator | No | `:focus-visible` outline | Green outline |

## Verification

There is no new test. jsdom does not compute layout, and a test that reads the SCSS text would pass whether or not the layout works. `ChatMessage.test.js` already covers the markup and the lightbox. The SCSS compiles with `sass`. Full web suite with `--testTimeout=30000`: 270 suites passed, 6 skipped, 3598 tests passed, 47 skipped. Not checked in a browser; a reviewer should send an image from the host inbox on desktop and on a narrow screen.
