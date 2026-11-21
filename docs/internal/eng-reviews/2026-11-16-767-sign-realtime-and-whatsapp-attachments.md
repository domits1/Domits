# Sign attachment URLs for realtime and WhatsApp: engineering review

Branch: `fix/767-sign-chat-attachment-urls`
Reviewed: the staged diff for the realtime and WhatsApp commit (5 files, code and tests plus this record)
Builds on: `2026-11-16-767-attachment-url-signer.md` and `2026-11-16-767-sign-attachments-in-message-responses.md`

## Decision

Two more places hand attachment URLs to something that cannot use the private bucket, so both sign:

```
publishRealtimeMessage ── fileUrls, attachments ─▶ signed ─▶ WebSocket Lambda ─▶ browser
WhatsApp sendMessage ──── attachments ───────────▶ signed ─▶ Meta (downloads `link` anonymously)

stored message, retry payload ◀── raw URL, unchanged
```

- `publishRealtimeMessage` signs `fileUrls` and `attachments` once, so its three callers (`messageService`, `whatsappService`, `channexWebhookService`) are all covered. Inbound WhatsApp media carries a `mediaId` and no URL, so nothing changes for it.
- `WhatsAppProviderAdapter.sendMessage` signs the attachments just before `buildPayload`. Meta fetches the `link` itself without credentials, so a raw private URL would fail there. One hour is far longer than Meta needs.
- Signing happens inside `sendMessage`, after the message row is built. The signed URL goes only into the request to Meta; it is not in `providerResult` and is not stored. A retry reads the raw URL from the database and signs again.
- Channex rejects attachments (`CHANNEX_ATTACHMENTS_UNSUPPORTED`), so it needs nothing.
- The adapter takes the signer as a constructor option, like `MessageService`, so tests inject a fake. The registry builds it with no arguments and gets the real signer.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` `messageService.js` (`attachments: resolvedPayload.attachments`, passed to `createMessage` and bound to a `text` column) and `ORM/models/unified/messaging/UnifiedMessage.js:59` (`attachments: { type: "text" }`, no transformer): `pg` turns a JS array into a Postgres array literal (`{"{\"url\":...}"}`), which is not JSON. If that is what is stored, `signAttachments` receives a string it cannot parse and returns it unchanged, and the browser could not parse it either. | 6/10 (the driver behaviour is checked; the stored value is not) | Not fixed here. It needs one query on the database to confirm, and a decision about a write-side fix and old rows. Raised with the author. |
| `[P3]` `publishRealtimeMessage.js` (`fileUrls: await signUrlList(...)`): signing runs before the `try` that invokes the Lambda. | 8/10 | Accepted: the signer never throws. It logs and returns the raw URL. |
| `[P3]` `whatsappProviderAdapter.js` (`attachments: signedAttachments`): `buildPayload` still checks `Array.isArray(attachments)`, so a retry whose stored attachments are a string sends text only. | 5/10 | Pre-existing, same cause as the first finding. Not changed here. |

## Not in scope

- Live messages that the browser relays to the other participant over the websocket: frontend branch.
- `getMessagesByUsers`, which nothing calls.
- Storing attachments as JSON on write, and repairing old rows.

## What already exists

- `signAttachments` and `signUrlList` from the helper commit.
- The constructor-option pattern from `MessageService`.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| WhatsApp send of a bucket image | Meta gets a 403 and rejects the message | Yes | Link is signed before the request | Delivered image |
| WhatsApp send of a link on another host | Link altered | Yes | Signer leaves it unchanged | Delivered image |
| Signing throws | Exception stops the send | Yes (helper) | Raw URL is used | Possible Meta failure for that image, with the normal failed-message state and retry |
| Realtime message without attachments | Body changes shape | Yes | `fileUrls: []`, `attachments: null` as before | Unchanged |
| Realtime message with attachments | Recipient gets the raw URL | Yes | Both fields signed | Image loads |

## Corrections to earlier records

The size note in `2026-11-16-767-sign-attachments-in-message-responses.md` said 4 files and +227 -5. The commit is 3 files and +179 -5, record included.

## Verification

New tests were red first: the realtime body carried raw URLs and the WhatsApp request carried the raw link. `functions/UnifiedMessaging`: 56 suites, 703 tests passed. Full backend run: 433 suites and 6138 tests passed. The same three suites fail locally for reasons unrelated to messaging: two need AWS credentials and one needs a live database.
