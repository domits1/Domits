# feat(onboarding): show the status of the security, owners and messaging steps in enterprise onboarding

Pull request: (to be opened)
Issue: (none linked)
Reviewed commit: uncommitted changes on top of 153c9d7ac
Result: no blocking findings

Covers stage 2 of the three optional, account-wide steps on `/hostdashboard/settings/onboarding/enterprise`. Stage 1 (`153c9d7ac`) added the step keys `security`, `owners` and `messaging` after `team`, their links and their texts in the four language files. This change adds a status check for each step in `onboardinghub/services/onboardingStatusService.js`, calls them from `onboardinghub/pages/HostOnboardingEnterprise.jsx`, and adds tests in `onboardingStatusService.test.js`. No backend, dependency or text changes.

What the checks do:

- `checkSecurityStatus` reads the signed-in user with `Auth.currentAuthenticatedUser()`, then `Auth.getPreferredMFA(user)`, and normalises the result with `normalizePreferredMfa`. Complete when the result is not `"NOMFA"`, so both TOTP and SMS count.
- `checkOwnersStatus` calls `listOwners()`. Complete when at least one owner's status is not `ARCHIVED_OWNER_STATUS`.
- `checkMessagingStatus` calls `listAutomations()`. Complete when at least one automation has status `"ACTIVE"`.
- Each returns `{ complete, scope: "account" }`. A rejected call, or for owners and messaging a response that is not a list, returns `{ complete: false, scope: "account", unknown: true }`, which the tile shows as "Could not check status".
- None of the three is in `REQUIRED_STEP_KEYS`, so `computeIsGoLiveReady` never reads them and the Go Live pill is unchanged.

```
HostOnboardingEnterprise (mount)
   │
   ├──▶ fetchHostProperties ──▶ listProperties, website
   │
   └──▶ Promise.all ─┬─▶ checkCompanyStatus      ──▶ company profile API
                     ├─▶ checkTeamStatus         ──▶ host-team API
                     ├─▶ checkSecurityStatus     ──▶ Cognito (Amplify Auth)      new
                     ├─▶ checkOwnersStatus       ──▶ property-owners API         new
                     ├─▶ checkMessagingStatus    ──▶ AutomatedMessaging API      new
                     └─▶ channels, payments, pricing, tasks, marketplace
                                   │
                                   ▼ every check settled
                          setStepStatus ──▶ 12 tiles, progress n/12
                                        └─▶ computeIsGoLiveReady(required keys only)
```

Contracts checked against the source:

- `AutomatedMessaging/business/automationService.js:117-126`: `list` returns a plain array of DTOs, and the DTO copies `status` unchanged (`status: automation.status`, line 54). The statuses are `"DRAFT"` and `"ACTIVE"` (lines 135, 147).
- `hostowners/utils/ownerFormRules.js:16`: `ARCHIVED_OWNER_STATUS = "archived"`, the same lowercase value the backend sends.
- Amplify `@aws-amplify/auth` 5.6.23: `setPreferredMFA` reloads the user data with `bypassCache: true` after saving. So `getPreferredMFA` without `bypassCache` does not return a stale value after the host turns on the authenticator app in the same tab.

Tests: 19 new tests in `onboardingStatusService.test.js`, 39 in that file in total, all passing.

- security: `TOTP`, `SOFTWARE_TOKEN_MFA`, `SMS` and `SMS_MFA` are complete, `NOMFA`, `""` and `undefined` are not, and both a failed user lookup and a failed MFA lookup report unknown
- owners: one active owner among archived ones is complete, an empty list and an archived-only list are not, and a response that is not a list and a failed request report unknown
- messaging: one `ACTIVE` automation among drafts is complete, an empty list and a draft-only list are not, and a `null` response and a failed request report unknown

Full web suite (`CI=true`, 2 workers): 257 suites passed and 2 failed. The 2 failing suites, 10 tests in all, already fail on `acceptance`: `listingDetails2.test.js` uses June 2026 dates that are now in the past, and `HostPayments.test.js` depends on the machine's number locale. ESLint is clean on the three files. No mutation checks were run.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | frontend/web/src/features/hostdashboard/onboardinghub/pages/HostOnboardingEnterprise.jsx:90 | `const [company, team, security, owners, messaging, website, channels, payments, pricing, tasks, marketplace] =` gets 11 results by position from `Promise.all`. No test renders this page, so if two entries are in a different order in the destructuring and in the `Promise.all` call, one step's status shows on another tile and every test still passes. This change takes the list from 8 to 11 entries. | Accepted. Same pattern as the existing 8 checks. A manual check confirmed that each tile shows its own status (Owners complete, Security and Messaging not started, 4 of 12). A page-level test is a possible follow-up. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/onboardinghub/services/onboardingStatusService.js:147 | `const user = await Auth.currentAuthenticatedUser();` reads the MFA of whoever is signed in, a single Cognito user, while the tile gets `t.accountWideBadge` (page line 160) like every other step. A team member who opens the page sees their own MFA status, not the host's. "Account" means the host's portfolio on the other tiles and one person's login on this one. | Accepted. "Account-wide" was agreed for all three steps. It is listed under Notes / Risks in the PR for the supervisor's decision. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/onboardinghub/services/onboardingStatusService.test.js:16 | `jest.mock("aws-amplify", () => ({ Auth: { currentAuthenticatedUser: jest.fn(), getPreferredMFA: jest.fn() } }))` replaces the whole module for the file. Other services the status service imports call `Auth.currentSession()` (`services/getAccessToken.js:27`, `components/settings/api/companyProfile.js:7`, `hostpricelabs/services/priceLabsService.js:6`), which is `undefined` here. A later test for `checkCompanyStatus` or `checkPricingStatus` would hit a `TypeError`, the `catch` would turn it into unknown, and a test for unknown-on-error would pass for the wrong reason. No current test is affected. | Fixed. Added `currentSession: jest.fn()` to the mock. |
| P3 (6/10) | backend/functions/AutomatedMessaging/business/automationService.js:121 | `if (!automation.propertyId \|\| await this.bookings.hostOwnsProperty(hostId, automation.propertyId))` runs one ownership query per automation that has a property, one after another. The onboarding page now calls `list` on every visit only to get a yes or no answer, and `Promise.all` holds back every tile until the slowest check returns. None of the new calls has a timeout, so a hanging request keeps all 12 tiles on the loading dot. The automations page already pays the same cost. | Accepted. This is pre-existing backend behaviour that the Automations page also has. Follow-up if the page gets slow: an "any active automation" endpoint, or tiles that settle one by one. |

Appendix, below the reporting line:

- P3 (4/10) `onboardingStatusService.js:161`: `owner?.status !== ARCHIVED_OWNER_STATUS` also counts an entry without a status, or a `null` entry, as a live owner. Unverified whether the backend can return either. The owner form always sends a status.

## Not in scope

- The hardcoded fallback URL in `hostmessages/services/automationService.js:3`, which is used when `REACT_APP_AUTOMATED_MESSAGING_API_URL` is not set. It was there before this change.
- `REACT_APP_PROPERTY_OWNERS_API_URL` appears only in `.env.local`. When a deployed build does not set it, `getOwnerApiUrl` throws, and the Owners tile shows "Could not check status" instead of failing the page. Check the deploy configuration separately.
- Counting SMS as complete. The Privacy & Security page still shows SMS as coming soon. It was agreed that any MFA other than `NOMFA` counts.
- The two failing suites `listingDetails2.test.js` and `HostPayments.test.js`, which already fail on `acceptance`.
- The Prettier differences in existing lines of the page and the test file, which this change does not touch.
- The progress bar now counts 12 steps instead of 9. That came with stage 1 and was agreed there.
