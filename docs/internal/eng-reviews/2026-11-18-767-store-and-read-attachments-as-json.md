# Store and read message attachments as JSON: engineering review

Branch: `fix/767-sign-chat-attachment-urls`
Reviewed: the staged diff for the stored-attachments commit
Builds on: `2026-11-16-767-sign-attachments-in-message-responses.md` and `2026-11-16-767-sign-realtime-and-whatsapp-attachments.md`, which left one finding open: how outbound attachments are stored.

## Problem

`MessageRepository.createMessage` bound the `attachments` array straight into a `text` column, and `UnifiedMessage.js:59` has no transformer. `pg` turns a JS array into a Postgres array literal. Checked locally with `pg`'s own serializer:

```
[{url, type, name}]  ──pg──▶  {"{\"url\":\"https://...\",\"type\":\"image\",\"name\":null}"}   (not JSON)
```

The inbound Channex path already stores `JSON.stringify` output (`ingestionService.js:82`), and the browser readers (`useFetchMessages.js`, `webSocketContext.js`) call `JSON.parse` on a string. So outbound rows in the literal form cannot be read by the browser, and the signer could not sign them.

## Decision

`util/storedAttachments.js` holds the two conversions, so the repository, the signer and the retry path agree:

- `serializeAttachments` (write): an array becomes `JSON.stringify(array)`, a string stays as it is (no double encoding for the inbound path), `null` and `undefined` become `null`.
- `parseStoredAttachments` (read): an array stays an array; a JSON array string is parsed; a Postgres array literal of JSON objects (the form already in the table) is parsed; anything else gives `null`.

Where each is used:

- `createMessage` writes with `serializeAttachments`. It still returns the attachments exactly as the caller passed them, so responses and realtime messages are unchanged.
- `signAttachments` reads strings with `parseStoredAttachments`. A literal row now comes back as a JSON array string with signed URLs. A string that cannot be parsed is returned unchanged.
- `retryMessage` reads the stored value with `parseStoredAttachments`. Retry only updates delivery fields and never writes attachments, so nothing is stored again there. It does read the row, and the provider adapters only accept an array, so a string would have sent text only.

Options weighed: migrate old rows with SQL (touches production data, needs a deploy step and a rollback plan), or make the reader tolerant (chosen: no data change, old rows work at once, and the write is fixed going forward). Consequence accepted: the tolerant parser stays in the code as long as old literal rows exist.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `messageService.js` (`attachments: parseStoredAttachments(message.attachments)`): a stored value that cannot be parsed becomes `null`, so a retry sends text only. | 7/10 | Accepted. The old code passed the unparsed string to an adapter that ignored it, so the outcome is the same. |
| `[P3]` `storedAttachments.js` (`parsePostgresArrayLiteral`): it handles the literal `pg` writes for objects (JSON text escaped for `"` and `\`). It does not handle unquoted elements or `NULL` elements, which `pg` never writes for this shape. | 8/10 | Accepted. Such a value returns `null` and is left unchanged. |
| `[P3]` Old messages whose attachments the browser could not parse will now show their images, as signed JSON. | 8/10 | Intended. |
| Whether other code writes `unified_message.attachments`. Only `createMessage`, the ingestion path and `createAutomatedMessageIfEligible` (writes `NULL`) are in this repo. The WebSocket Lambda is not in this repo. | n/a | Not verified for that Lambda. |

## Not in scope

- Rewriting the old rows in the database.
- A `transformer` on the entity in `backend/ORM`, which is shared by other Lambdas.
- The frontend refetch and local preview.

## What already exists

- `toNullableJsonString` in `ingestionService.js`, which already stores inbound attachments as JSON. `serializeAttachments` keeps that string unchanged.
- The frontend readers that already parse a JSON string.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Send with an attachment array | Stored as a Postgres literal | Yes (repository test) | Stored as JSON | History shows the image |
| Inbound Channex or WhatsApp string | Encoded twice | Yes | String kept as is | Unchanged |
| Old row in literal form | Not signed, not readable | Yes | Parsed, signed, returned as JSON | Image loads |
| Value with quotes, backslashes or newlines in a name | Parse error | Yes, also cross-checked against `pg`'s serializer | Same escaping as JSON | Image loads |
| Unparseable stored string | Exception | Yes | Returned unchanged | Same as before |
| Retry of a media message | Attachments dropped | Yes (JSON string and literal) | Parsed to an array | Media is resent |

## Verification

New tests were red first (a missing module, the repository storing the array, the signer and the retry not reading the literal). `functions/UnifiedMessaging`: 58 suites, 734 tests passed, then 19 tests in `storedAttachments.test.js` after one more case was added. Full backend run: 435 suites and 6169 tests passed. The same three suites fail locally for reasons unrelated to messaging: two need AWS credentials and one needs a live database.
