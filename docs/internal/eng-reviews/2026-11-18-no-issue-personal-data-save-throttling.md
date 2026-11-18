# fix: save personal data without Cognito throttling

Pull request: (to be opened)
Issue: none; found while testing `/hostdashboard/settings/personal-data` on acceptance (Save sometimes shows "Failed to update title. Please try again.", the next Save works)
Reviewed commit: see the step sections
Result: no blocking findings

## Cause

Confirmed in the browser: `POST https://cognito-idp.eu-north-1.amazonaws.com/` returns 400 with `TooManyRequestsException: Too many requests on the same user`. `saveAll` in `usePersonalDataSave.js` starts every changed field's save at once and waits with `Promise.allSettled`. Each Cognito field (date of birth, place of birth, nationality, title, sex) calls `Auth.currentAuthenticatedUser()` and `Auth.updateUserAttributes()` on its own, and Amplify follows each update with a `GetUser`, so one Save sends several updates for the same user in the same instant. Whichever update loses the race fails: title one time, birthdate the next. The second Save works because the fields that succeeded already match `user`, so only the failed one is sent, alone.

## Step 1: one Cognito request for the profile fields

Reviewed: uncommitted changes on top of `e1d0d6cf0`, committed as `5d5ee2cdf`

```
saveProfileAttributes(changedKeys)
   ▼
validate dateOfBirth, nationality ── invalid ──▶ show the existing error, leave the field out
   │ valid: clear that field's error
   ▼
nothing left? ── yes ──▶ no Cognito call
   │ no
   ▼
Auth.currentAuthenticatedUser() ─▶ Auth.updateUserAttributes(user, { all valid fields })
   ├─ resolves ─▶ one setUser for all batched fields, close open edit modes
   └─ rejects ──▶ user unchanged, each batched field's existing failure message
```

`useUserProfile.js` gains `saveProfileAttributes(changedKeys)`, exposed as `onSaveProfileAttributes`. It sends the same attribute names and values as the single saves (`birthdate` via `formatBirthdateForStorage`, `custom:place_of_birth`, `custom:nationality` trimmed, `custom:title`, `gender`) in one request. It returns `false` when a field failed validation or the request failed, otherwise `true`. On failure the user sees the messages they see today, for exactly the fields in the batch: inline for date of birth and nationality, the existing `alert()` texts for title, sex and place of birth.

The batch clears the date of birth and nationality error once validation passes, the same pattern as the name, phone and email saves. A failed save followed by a successful one leaves no stale "Failed to update ..." message.

`saveAll` does not call the batch yet; that is step 2. This step changes nothing a user can see.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (9/10) | `useUserProfile.js:449`, `:455`, `:463`, `:469`, `:475` | The five failure texts now exist twice: in the single saves (`:403`, `:417`, `:437`, `:130`, `:143`) and in `profileAttributeFields`. | Accepted for this step: the single saves stay unchanged on purpose. See Not in scope. |
| P3 (8/10) | `useUserProfile.js:509`, `batchedKeys.filter((key) => editState[key]).forEach((key) => toggleEditState(key))` | Closing edit mode after a successful batch has no test. `PersonalDataForm` never opens edit mode, so this page doesn't reach it today. | Accepted: mirrors `:399`, `:413`, `:433`; add a test if a caller with edit mode uses the batch. |
| P3 (7/10) | `useUserProfile.js:484-485`, `const field = profileAttributeFields[key]; ... field.validate` | An unknown key throws a `TypeError` before the `try`, so the call rejects instead of returning `false`. | Resolved in step 2: `saveAll` passes fixed keys, and `runSaveStep` catches the rejection and counts it as a failed save without stopping the later steps. |
| Checked | `useUserProfile.js:503-510` | One `currentAuthenticatedUser()` and one `updateUserAttributes()` per batch. `toAttribute()` and `toLocal()` read the same `tempUser` snapshot, so local state matches what was sent. | No change. |
| Checked | `useUserProfile.js:511-514` | A rejected batch changes no `user` state and reports every batched field. Cognito accepts or rejects `UpdateUserAttributes` as one request, so every field in a failed batch really did fail. | No change. Behaviour change accepted: one rejected attribute fails all fields in the batch, where single saves failed one at a time. |
| Checked | tests | Five new tests: one request with exactly the batched attributes and one `currentAuthenticatedUser` call; a rejected batch keeps `user` and shows each field's existing message; an invalid date of birth is left out while title is sent; nothing valid sends nothing; a failed then successful batch leaves both errors empty. All failed before the change and pass after; the existing 55 tests are unchanged and pass. | No change. |

Local full web suite: besides the expected `HostPayments.test.js` (1) and `listingDetails2.test.js` (9), `QuoteAvailabilitySection`, `HostResponseEligibility` and `websiteEditorPageSitePages` timed out in the local full run. They also fail on the original code and do not import the changed hooks.

### Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| Cognito rejects the batch (throttling, invalid attribute, expired session) | Yes | `catch`: no state change, `console.error`, existing per-field messages | Inline errors and alerts, as today |
| A field fails validation | Yes | Left out of the batch, existing validation message | Inline error |
| Amplify's session lookup rejects inside `updateUserAttributes` | No | None: Amplify never settles the promise | The save never finishes; existing Amplify behaviour, see Not in scope |

## Step 2: saves run one after another

Reviewed: uncommitted changes on top of `5d5ee2cdf`

```
saveAll
   ▼
changed profile keys? ── yes ──▶ onSaveProfileAttributes(keys) ─┐
   │                                                            │ settled
   ▼◀───────────────────────────────────────────────────────────┘
name changed? ── yes ──▶ onSaveUserName ─┐
   ▼◀─────────────────────────────────────┘ settled
phone changed? ── yes ──▶ onSaveUserPhone ─┐
   ▼◀──────────────────────────────────────┘ settled
email changed? ── yes ──▶ onSaveUserEmail ─┐
   ▼◀──────────────────────────────────────┘ settled
any false or rejected ─▶ saveError · any "pending" ─▶ no "Saved!" · otherwise saveSuccess
```

`usePersonalDataSave.js` takes `onSaveProfileAttributes` instead of the five single profile saves. `saveAll` uses the existing change checks to collect the changed profile keys and calls `onSaveProfileAttributes(changedKeys)` once if any changed. Then it runs name, phone and email, each only when changed and each awaited before the next. `runSaveStep` wraps every step in `try/catch` and returns the same `{ status, value }` shape `Promise.allSettled` gave, so a failed step does not stop the later ones and the result handling is unchanged: any `false` or rejection is a save error, email `"pending"` shows no "Saved!", otherwise success. It catches a rejection and a synchronous throw alike. `isSaving` is now set before the first request starts; before, it was set just after all requests had been fired.

Why this order: the batch goes first because it holds the most fields and is the request that was throttled. Name comes next because it also calls `Auth.updateUserAttributes` from the browser (`given_name`, `family_name`) and must not overlap the batch. Email goes last because `"pending"` switches the form to code verification, which should happen after everything else has settled.

Tests in `usePersonalDataSave.test.js`: `baseProps` gets an `onSaveProfileAttributes` mock; the title, sex, failure and rejection tests now assert the batch call with the right keys. New: five changed profile fields give one batch call with all five keys and no single profile save; an order test with hand-resolved promises shows nothing else runs while the batch is pending, then name, phone and email each start only after the previous one settled; a batch that returns `false` or rejects reports `saveError` while name, phone and email still run. The email `"pending"` test is unchanged and passes. 8 of 12 failed before the change, 12 of 12 pass after; the four that passed before describe behaviour the old code already had.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `usePersonalDataSave.js:66-68`, `for (const saveStep of saveSteps) { results.push(await runSaveStep(saveStep)); }` | A step that never settles now blocks the steps after it. With Amplify's hang (`Auth.updateUserAttributes` calls `userSession(user).then(...)` with no rejection handler), a stuck batch means name, phone and email are not saved either; before, they ran in parallel and could still succeed. The button stays on "Saving..." in both versions. | Accepted: the cost of not overlapping requests; the hang itself is listed under Not in scope. |
| P3 (6/10) | `usePersonalDataSave.js:63`, `setIsSaving(true);` | `isSaving` now turns on before the first request, but no test asserts `isSaving` while a step is pending. | Accepted: the order test already holds the batch pending, so the assertion is cheap to add later. |
| P3 (6/10) | `usePersonalDataSave.js:66-68` | A full save now takes the sum of the steps instead of the longest one: up to the batch, the name Lambda plus its Cognito update, the phone Lambda and the email Lambda in a row. | Accepted: planned trade-off; four short requests, still well under the throttling cost. |
| Checked | `usePersonalDataSave.js:3-9`, `runSaveStep` | `save()` is called inside the `try`, so a synchronous throw and a rejection both become `{ status: "rejected" }`. `hasFailure` and `hasPending` read the same shape as before. | No change. |
| Checked | `usePersonalDataSave.js:47`, `:53`, `:57`, `:60` | The steps use the save functions from the render in which Save was pressed. `tempUser` doesn't change during a save, and the batch and name saves update `user` through `setUser((prev) => ...)`, so a later step does not overwrite an earlier one. | No change. |
| Checked | `usePersonalDataSave.js:11-20` | The five single profile saves are no longer props of this hook. `HostSettingsPersonalData.jsx` and `GuestSettings.js` still spread all of `settingsData` into it; the extra fields are ignored. | No change. |

Full web suite for this step: only `HostPayments.test.js` (1) and `listingDetails2.test.js` (9) failed, as expected. `QuoteAvailabilitySection`, `HostResponseEligibility` and `websiteEditorPageSitePages` all passed.

Manual check: pending

### Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| The batch fails or rejects | Yes | Counted as a failure; name, phone and email still run | Step 1's per-field messages, then the Save button's error state |
| A step never settles (Amplify hang) | No | None | The button stays on "Saving..."; later steps don't run |
| Email starts verification | Yes | `"pending"`: no "Saved!" | The verification code field |

## Not in scope

- The `"+1"` phone default: a user without a phone gets a phone save attempt on every Save, which fails with "Please enter a phone number."
- The name, phone and email Lambda calls are sent without an `Authorization` header, with only a `userId` in the body.
- `alert()` usage for title, sex and place of birth.
- The Amplify hang: `Auth.updateUserAttributes` calls `userSession(user).then(...)` with no rejection handler, so a failed session lookup leaves the save pending forever.
- The hardcoded `family: "2 adults - 2 kids"` placeholder in `fetchUserData`.
- The 404 on `uChatbotFetchChatHistory`.
- `saveUserTitle` and `saveUserSex` are only used by tests after step 2.
- The duplicated failure texts between the single saves and the batch.
- `onSaveUserDateOfBirth`, `onSaveUserPlaceOfBirth` and `onSaveUserNationality` are still used by `SettingsContent.jsx`, whose only importer, `HostSettings.js`, appears unused.
- The single date of birth and nationality saves never clear their own error on success, only through edit mode or typing, so a stale "Failed to update ..." can remain where they are used.
