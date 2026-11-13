# feat(property-review): email the host when a listing is approved or rejected (#3302)

Issue: #3302
Reviewed: staged diff of bb6c4b217 (ListingReviewNotifier, PropertyService.reviewPendingProperty), then the follow-up changes in the working tree
Result: 0 blocking, 1 fix now (fixed), 1 changed after review (IAM), 3 follow-up

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (6/10) | listingReviewNotifier.js, the `GetUserInfo` invoke | PropertyHandler may not invoke `GetUserInfo`. Its role can invoke only PriceLabs-Integration, UnifiedMessaging and, since this issue, EmailNotificationService. With the lookup denied, every email would be skipped and only a log line would show it. | Fixed. The host email is now read from Cognito through the existing `CognitoRepository.getUserById` (AdminGetUser, which the role already has on `*`). No Lambda other than EmailNotificationService is invoked, and a test checks that. |
| P3 (8/10) | listingReviewNotifier.js, `buildBody` | A REJECTED call without a reason printed "Reason:\nundefined". Unreachable through `rejectProperty`, which refuses an empty reason, but the notifier is a public class. | Fixed. A missing, blank or non-string reason leaves the reason block out. Tests cover undefined, null, an empty string, whitespace and a number. |
| P3 (7/10) | the Cognito email lookup | The same lookup (host id to email) now exists in several functions. They deploy separately, so they cannot share an import. | Follow-up: a shared helper in `.shared/`. |
| P3 (6/10) | listingReviewNotifier.js, the EmailNotificationService invoke | The business layer calls a Lambda directly. The Cognito read now goes through the data layer, but the email send does not. `priceLabsCalendarNotifier.js` in the same folder does the same. | Accepted, follows that precedent. |
| P3 (5/10) | propertyService.js, `reviewPendingProperty` | If the property cannot be re-read after a committed decision, the call throws not-found before the notifier runs, so no email goes out. The decision itself stands. | Accepted. Very rare, and the moderation event row remains the record. |

## Decisions

- Transport: plain text through the existing EmailNotificationService, invoked with `InvocationType: "Event"`. Confirmed by reading that Lambda: it sends SES `Text` only, with `Subject`, from teamdomits@gmail.com, and it expects `{ toEmail, subject, body }` and answers 400 when one is missing. No HTML, so no escaping.
- IAM: letting PropertyHandler invoke EmailNotificationService was approved by Stefan. No other permission was added. The Cognito read uses `cognito-idp:AdminGetUser`, which the role already has.
- Host address: `CognitoRepository.getUserById(hostId)`. `property.hostid` is written at propertyBuilder.js:53 (`propertyParams.hostId = userId`), and that `userId` is the `user.Username` that `authorizeGroupRequest` returns (authManager.js:57). That is the Username AdminGetUser expects. The user pool id is hard-coded in `CognitoRepository`, so there is no environment variable to set.
- When it runs: after the review transaction has committed and the property has been re-read, never inside the transaction (`withDsqlRetry` can run the transaction more than once).
- Best effort: every failure (Cognito lookup, missing email, invoke) is logged with ids and an error code and swallowed. A failed email never fails or undoes the approve or reject. There is no retry and no outbox; a crash between the commit and the invoke loses the email.
- Always sent: a review decision is transactional, so the communication preferences do not apply. They have no listing-review event.
- Recipient: the host only. English only, because no locale is stored.
- Privacy: the notifier has no input for the reviewer, so the admin's identity cannot reach the email. The rejection reason is in the body only. The subject is one line and the title in it is cut at 80 characters. Logs hold the property id, the outcome and an error code, never the reason or the address.

## Not in scope

- In-app notification: the only store, `task_notification`, is keyed by task.
- A communication-preferences event key for listing reviews.
- Dutch or any other language.
- An outbox with retries.
- Emailing team members with property-management roles.

## Mutation check

`propertyService.js` was copied to the scratchpad (sha256 f2abda6972f31656af54df6e83a6ac0a88a599aee8f2a80c6b3f27e41f59f087), mutated in place, and restored from the copy after each run. The sha256 was identical after the last restore. `reviewPendingProperty` has no single `outcome === "changed"` check: a result that is not `not_found`, `wrong_status` or `stale` falls through to the notifier, so each of the three throws was disabled in turn. The statusReview test file has 66 tests and passes clean.

| Mutation | Result |
|---|---|
| `wrong_status` guard disabled | 17 tests failed |
| `stale` guard disabled | 4 tests failed |
| `not_found` guard disabled | 66 passed. An equivalent mutant: the next line re-reads the property, gets null and throws the same NotFoundException before the notifier is reached. |
| notifier call removed | 2 tests failed |
