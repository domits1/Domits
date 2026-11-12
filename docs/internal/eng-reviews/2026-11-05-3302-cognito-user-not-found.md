# fix(property-handler): throw NotFoundException for a Cognito user that does not exist (#3302)

Issue: #3302
Reviewed: working tree against `acceptance` (2 source files, 3 test files; nothing staged or committed), eng-review skill run on the named target
Result: 0 blocking, 0 fix now, 4 follow-up, 2 appendix

## What changed

- `CognitoRepository.getUserByAccessToken` and `getUserById` called `NotFoundException("User not found.")` without `new` inside a ternary. Calling an ES class without `new` throws a `TypeError`, so an empty Cognito response surfaced as an untyped error. Both methods now use `if (!result?.Username) throw new NotFoundException("User not found.")`.
- `REJECTED_TOKEN_ERRORS` in `AuthManager` gains `"NotFoundException"`, so a token that resolves to no user becomes `Unauthorized` (401, with `cause`) like the other failed logins, instead of a 404 on an auth path.

## Findings

| Verdict | Where | Finding | Decision |
|---|---|---|---|
| FOLLOW-UP (5/10) | authManager.js `getUserInfoFromId` | The `catch` turns every failure, including a Cognito timeout or throttle, into a 404 "Could not request the property's userid.", so an outage on `GET /property/bookingEngine/listingDetails` reads as a missing host. Pre-existing, unchanged here. | Deferred; separate behaviour change. |
| FOLLOW-UP (4/10) | `backend/functions/*/data/cognitoRepository.js` | Other functions (Wishlist-Handler, Ical-retrieve, Get-Booking-Data, PriceLabs-Integration and others) have their own `cognitoRepository.js` copies. Not inspected here, so it is unknown whether they share the missing `new`. | Check in a separate change. |
| FOLLOW-UP (3/10) | cognitoRepository.js `getUserById` | Real Cognito answers an unknown user with its own `UserNotFoundException` from `send`, so the fixed branch only runs for a response without `Username`. The fix is correct but mostly defensive. | Accepted. |
| FOLLOW-UP (5/10) | authManager.js:17 | `REJECTED_TOKEN_ERRORS` matches on the error name string only (`"NotFoundException",`). The 401 mapping depends on `NotFoundException` keeping `this.name = "NotFoundException"` and on no other `NotFoundException` being thrown inside the `try` of `getAuthorizedUser`. Today the `try` wraps only `getUserByAccessToken`, and a test pins the 401, so a rename fails the suite. | Accepted; revisit if the `try` grows. |

## Behaviour per caller

- `getAuthorizedUser`: response without a user now gives 401 instead of an untyped error (500).
- `getUserInfoFromId`: 404 "Could not request the property's userid." before and after; only the logged cause changes.
- `WebsitePublicHostService.#loadProfile`: generic `catch` returns the empty host block before and after.

## Tests

- New `cognitoRepository.test.js`: both methods, empty and missing response give `NotFoundException`, status 404, not a `TypeError`; a known user is returned as the same object. The Cognito client is replaced through the `cognitoClient` field, with ids and tokens outside the `TEST` fixtures.
- `authManagerTokenCheck.test.js`: new case "a token Cognito returns without a user" gives `Unauthorized`, 401, with `cause`.
- New `authManager.getUserInfoFromId.test.js`: a rejecting `NotFoundException` still gives the 404 message.

## Mutation check

Scratchpad copies of `cognitoRepository.js` and `authManager.js`, restored after each run; sha256 of both files identical before and after.

- `throw new NotFoundException` changed back to `throw NotFoundException`: 4 tests failed (the `TypeError` cases).
- `"NotFoundException"` removed from `REJECTED_TOKEN_ERRORS`: 1 test failed (the 401 case).

## Test run

- Touched tests: 3 suites, 21 tests, green.
- `test/PropertyHandler`: 2 failing suites, both known and unrelated (`builder-unit-unhappy-path`, `end-to-end`: expired AWS SSO token and live database).
- Full backend: 6 failing suites, none touching these files: the two above, `lambdaRepository` (expired SSO), and `directBookingSitesDeployWorkflow`, `directBookingWebsiteRatePlan.schema`, `staticPageEdgeAliasMap` (content assertions on workflow, schema and alias files).

## Appendix (confidence 3-4, not raised as findings)

- cognitoRepository.js:46-48 and :62-64 repeat the same four-line guard. Two instances is not yet worth a helper; extract it if a third method needs it.
- cognitoRepository.js:38 and :53 return hardcoded test users when `process.env.TEST === "true"`. Unchanged by this diff. Whether `TEST` can be set on a deployed Lambda was not verified.

## Not in scope

- Mapping Cognito service failures (timeout, throttle) to a non-404 in `getUserInfoFromId`: separate behaviour change, listed as a follow-up above.
- The copies of `cognitoRepository.js` in other functions: not inspected.
- A controller-level test of the 401 response: `getAuthorizedUser` is already covered, and the controllers map `error.statusCode` the same way.

## What already exists

- The 401 path already existed for the Cognito error names in `REJECTED_TOKEN_ERRORS`; this change reuses it with one more name instead of adding a second mapping.
- `authManagerTokenCheck.test.js` already held the failed-login table; the new case is one more row.

## Failure modes

| Path | Realistic failure | Test | Handling | User sees |
|---|---|---|---|---|
| getUserByAccessToken | Cognito answers without a Username | yes | 401 Unauthorized with cause | "You must be logged in." |
| getUserById | Cognito answers without a Username | yes | NotFoundException, 404 at the caller | 404, or an empty host block on the public website |
| getUserInfoFromId | Cognito times out or throttles | no | swallowed into a 404 (pre-existing) | a misleading 404 |

No critical gap: every new path has a test, handling and a visible symptom.
