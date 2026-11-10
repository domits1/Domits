# feat: retry button for failed replies in the host inbox #767

Branch: feat/767-retry-failed-reply
Issue: #767
Result: no blocking finding. 1 P2 found in the backend staged diff, fixed before the commit. The gate runs again on each later commit; this record is extended with them.

## Commits reviewed

| Commit | Result |
|---|---|
| feat(messages): retry a failed provider reply through POST /send | 1 P2 fixed before the commit, see Findings |
| refactor(messages): extract postToSend | no findings; the diff moves the fetch and error handling unchanged, full web suite green |
| feat(messages): retry service, hook and Retry button | no blocking finding; one P3 below |
| refactor(messages): extract buildSettledMessage | no findings; fallbacks `nowIso` and `optimisticId` equal the optimistic message's own `createdAt` and `id`, full web suite green |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | backend/functions/UnifiedMessaging/business/messageService.js:509 `metadata: message.metadata` with buildStoredMetadata `typeof payload.metadata === "string" ? { rawMetadata: payload.metadata }` | The `metadata` column is `text`, so the stored row comes back as a string. A retry wrapped the old JSON under `rawMetadata` and every further retry nested it deeper; `isAutomated` and `channel`, which the frontend reads from the top level (`useFetchMessages.js:152`), moved out of reach. | Fixed in the same commit: `parseStoredMetadata` parses the string before it is passed on. One test pins the top-level keys. |
| P3 (7/10) | backend/functions/UnifiedMessaging/business/messageService.js `retryMessage`, between `claimFailedMessageForRetry` and `updateDeliveryResult` | If the Lambda dies or the database update fails after the claim, the row stays `pending` and shows no Retry button. | Accepted risk, chosen on purpose: sending the same reply to a guest twice is worse than a rare stuck row. Provider calls have a request timeout, so normal failures still end as `failed`. A stuck `pending` row needs a manual database update to `failed`. |
| P3 (6/10) | docs/partner/integrations/channel_manager/channel_management_api_gateway_authorizer.md | `/{proxy+}` has no authorizer, so a new path would never get claims. | Handled by design: retry goes through the existing `POST /send` with `retryMessageId`, so no new route and no AWS change. The claim check is the same `getAuthenticatedUser` as for a new message. |
| P3 (6/10) | frontend/web/src/components/messages/ChatMessage.js `canRetry = isOutgoing && deliveryStatus === "failed" && typeof onRetry === "function"` | The button also shows on a failed outgoing message in a Domits-only thread, where the backend answers 409 because there is no provider to resend through. | Accepted: Domits-only messages are saved as `delivered`, never `failed`, so the case does not occur today; the 409 shows the existing toast if it ever does. |

Prettier reports `ChatMessage.js`, `messagingService.js`, `messagingService.test.js` and `messagesV2.scss` as unformatted on `acceptance` already. The diff keeps their existing layout instead of reformatting whole files.

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| retryMessage | two tabs click Retry at the same time | yes (claim returns 0) | 409, nothing sent | yes, the second tab gets an error |
| retryMessage | a guest or another host calls it with a message id | yes (403) | rejected before the claim | yes |
| retryMessage | the provider still fails | yes | new errorCode and errorMessage saved on the same row, 502 | yes, "!" and the toast |
| retryMessage | process dies after the claim | no | row stays `pending` | no, accepted risk above |
| retryMessage | the message is already sent or delivered | yes (409) | nothing sent | yes |
| retryMessage | a Domits-only thread has no provider | yes (409) | nothing sent | yes |

## What already exists

- `sendViaProviderAdapter` is reused as it is, so errorCode and errorMessage are produced the same way as for a first send.
- `assertThreadAccess` and `getAuthenticatedUser` are reused for the access check.
- `POST /send` is reused; there is no new route.

## Not in scope

- A timeout or sweeper that moves old `pending` rows back to `failed`: would need a schedule and a clock decision. Deferred until a stuck row is seen.
- Retrying messages with attachments: the Channex adapter rejects them (`CHANNEX_ATTACHMENTS_UNSUPPORTED`), so the retry fails the same way.
- Four backend suites fail on `acceptance` without this change (SiteMinder reservationsMessage, General-Bookings lambdaRepository, PropertyHandler builder-unit-unhappy-path and end-to-end, 23 tests). They fail identically on a clean checkout and are not touched here.
