# Sign attachment URLs in message responses: engineering review

Branch: `fix/767-sign-chat-attachment-urls`
Reviewed: the staged diff for the message-service commit (3 files, +179 -5, including this record)
Builds on: `2026-11-16-767-attachment-url-signer.md`

## Decision

`MessageService` signs attachment URLs on the way out, in the three responses that return a message:

```
getMessages        repository rows ─▶ signMessages ─▶ response
sendMessage        created message ─▶ signMessage ─▶ response (201 and 502)
retryMessage       updated message ─▶ signMessage ─▶ response (200 and 502)

repository, provider adapter ◀── raw URL, unchanged
```

The database and the provider adapter keep the raw URL. Only the response is signed, so old messages work without a migration and a retry sends what was stored.

- The signer is a constructor option (`attachmentSigner`), like `realtimePublisher` and `providerAdapters`, so tests inject a fake and the default is the real helper.
- Options weighed: sign inside `MessageRepository` (every reader would then get signed URLs, including retry and the provider send, which must stay raw), or sign at the service exits (chosen).
- Consequence accepted: every new exit that returns a message must remember to sign it. The three exits that exist today are covered by tests.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `messageService.js` (`response: await this.attachmentSigner.signMessages(messages)`): a thread with many attachments signs them all in one `Promise.all`. Presigning is local computation, so there are no network calls. | 7/10 | Accepted. |
| `[P3]` `messageService.js:getMessagesByUsers` (`response: messages`) stays unsigned. | 9/10 | Accepted: it has no caller outside tests. Sign it in the same way if it is ever routed. |
| `[P2]` (unverified) `messageService.js` retry (`attachments: message.attachments`): the column is `text`, so the retry may hand the adapter a JSON string instead of an array and the WhatsApp adapter would send text only. | 5/10 | Pre-existing and not changed here. The WhatsApp commit checks it. |

## Not in scope

- `publishRealtimeMessage` and the WhatsApp adapter: next commit.
- `getMessagesByUsers`: unused.
- The frontend refetch and local preview.

## What already exists

- The `realtimePublisher` and `providerAdapters` constructor options. The signer follows the same pattern.
- `signMessage` and `signMessages` from the helper commit.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Signing fails for one URL | Exception | Yes (helper tests) | Raw URL is returned, message intact | One broken image |
| Message has no attachments | `signMessage` touches the response | Yes | `attachments: null` stays `null` | Unchanged |
| Send fails at the provider (502) | Response unsigned | Same code path as 201 | Signed in both cases | Signed image on the failed message |
| Retry | Provider receives a signed URL that expires | Yes | Adapter gets the raw URL | Unchanged |

## Verification

`messageService.attachmentSigning.test.js`: 3 tests, red before the change (the responses carried the raw URL). `functions/UnifiedMessaging`: 55 suites, 698 tests passed. Full backend run: 432 suites and 6133 tests passed. The same three suites fail locally for reasons unrelated to messaging: two need AWS credentials and one needs a live database.
