# feat: retry button for failed replies in the host inbox #767

Branch: feat/767-retry-failed-reply
Issue: #767
Result: 1 blocking finding (P1, ChatScreen), reported alone and fixed before its commit; no blocking finding open. 1 P2 in the backend diff, fixed before its commit. The gate ran on every commit.

## Commits reviewed

| Commit | Result |
|---|---|
| feat(messages): retry a failed provider reply through POST /send | 1 P2 fixed before the commit, see Findings |
| refactor(messages): extract postToSend | no findings; the diff moves the fetch and error handling unchanged, full web suite green |
| feat(messages): retry service, hook and Retry button | no blocking finding; one P3 below |
| refactor(messages): extract buildSettledMessage | no findings; fallbacks `nowIso` and `optimisticId` equal the optimistic message's own `createdAt` and `id`, full web suite green |
| feat(messages): retry in ChatScreen | 1 P1 (wrong recipient on retry), fixed before the commit; 1 P3 accepted |
| docs(messages): document the retry contract | no findings; status codes and the `retryMessageId` dispatch checked against `messageService.js` and `messageController.js` |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | backend/functions/UnifiedMessaging/business/messageService.js:509 `metadata: message.metadata` with buildStoredMetadata `typeof payload.metadata === "string" ? { rawMetadata: payload.metadata }` | The `metadata` column is `text`, so the stored row comes back as a string. A retry wrapped the old JSON under `rawMetadata` and every further retry nested it deeper; `isAutomated` and `channel`, which the frontend reads from the top level (`useFetchMessages.js:152`), moved out of reach. | Fixed in the same commit: `parseStoredMetadata` parses the string before it is passed on. One test pins the top-level keys. |
| P3 (7/10) | backend/functions/UnifiedMessaging/business/messageService.js `retryMessage`, between `claimFailedMessageForRetry` and `updateDeliveryResult` | If the Lambda dies or the database update fails after the claim, the row stays `pending` and shows no Retry button. | Accepted risk, chosen on purpose: sending the same reply to a guest twice is worse than a rare stuck row. Provider calls have a request timeout, so normal failures still end as `failed`. A stuck `pending` row needs a manual database update to `failed`. |
| P3 (6/10) | docs/partner/integrations/channel_manager/channel_management_api_gateway_authorizer.md | `/{proxy+}` has no authorizer, so a new path would never get claims. | Handled by design: retry goes through the existing `POST /send` with `retryMessageId`, so no new route and no AWS change. The claim check is the same `getAuthenticatedUser` as for a new message. |
| P3 (6/10) | frontend/web/src/components/messages/ChatMessage.js `canRetry = isOutgoing && deliveryStatus === "failed" && typeof onRetry === "function"` | The button also shows on a failed outgoing message in a Domits-only thread, where the backend answers 409 because there is no provider to resend through. | Accepted: Domits-only messages are saved as `delivered`, never `failed`, so the case does not occur today; the 409 shows the existing toast if it ever does. |

Prettier reports `ChatMessage.js`, `messagingService.js`, `messagingService.test.js` and `messagesV2.scss` as unformatted on `acceptance` already. The diff keeps their existing layout instead of reformatting whole files.
| P1 (8/10) | frontend/web/src/components/messages/ChatScreen.jsx `resendUnsavedMessage` (before) `const result = await sendMessage(resolvedContactId, text, fileUrls, options);`, with `localMessages` merged unscoped (`const merged = [...baseArr, ...localMessages, ...extras];`) and `ChatScreen` rendered without a `key` in `Messages.js:507` | A message that failed before it was saved now stays on screen. It then showed in the next conversation, and Retry sent it to the contact open at retry time. For a first message without a thread, guest A's text would reach guest B. | Fixed before the commit: `retryPayload` stores `recipientId` and the retry uses it; an unsent failed message is only shown when its `recipientId` matches the open contact and, when it has a `threadId`, that matches the open thread. One test switches the contact, checks the message is hidden, and checks the retry goes to the original guest. |
| P3 (7/10) | frontend/web/src/components/messages/ChatScreen.jsx `uniq.push(m.id && retryOverrides[m.id] ? { ...m, ...retryOverrides[m.id] } : m)` | A retry result is kept for the life of the screen. If a later status such as `delivered` arrives for that message, the screen keeps showing `sent` until a reload. | Accepted: Channex replies end at `sent`, so nothing newer arrives for the channel this feature targets. Revisit if retry is opened for a channel with delivery receipts. |

Follow-up, not in this pull request: `localMessages` is never scoped to the open conversation, so messages that were saved (sent or failed with an id) can also show in another conversation. This existed before this change; the fix above only hides unsent failed messages. To be raised as its own issue (scope `localMessages` by thread or contact, or give `ChatScreen` a `key` per conversation).

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| retryMessage | two tabs click Retry at the same time | yes (claim returns 0) | 409, nothing sent | yes, the second tab gets an error |
| retryMessage | a guest or another host calls it with a message id | yes (403) | rejected before the claim | yes |
| retryMessage | the provider still fails | yes | new errorCode and errorMessage saved on the same row, 502 | yes, "!" and the toast |
| retryMessage | process dies after the claim | no | row stays `pending` | no, accepted risk above |
| retryMessage | the message is already sent or delivered | yes (409) | nothing sent | yes |
| retryMessage | a Domits-only thread has no provider | yes (409) | nothing sent | yes |
| ChatScreen retry | host switches conversation after an unsent failure | yes | message hidden elsewhere, retry goes to the original recipient | yes, the message is back when the host returns |
| ChatScreen retry | double click on Retry | yes | ref guard, one request | yes, pending and disabled |

## What already exists

- `sendViaProviderAdapter` is reused as it is, so errorCode and errorMessage are produced the same way as for a first send.
- `assertThreadAccess` and `getAuthenticatedUser` are reused for the access check.
- `POST /send` is reused; there is no new route.

## Not in scope

- A timeout or sweeper that moves old `pending` rows back to `failed`: would need a schedule and a clock decision. Deferred until a stuck row is seen.
- Retrying messages with attachments: the Channex adapter rejects them (`CHANNEX_ATTACHMENTS_UNSUPPORTED`), so the retry fails the same way.
- Four backend suites fail on `acceptance` without this change (SiteMinder reservationsMessage, General-Bookings lambdaRepository, PropertyHandler builder-unit-unhappy-path and end-to-end, 23 tests). They fail identically on a clean checkout and are not touched here.
