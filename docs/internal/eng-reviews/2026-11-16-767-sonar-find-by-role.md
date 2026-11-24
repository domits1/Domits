# Retry test uses findByRole, Sonar javascript:S9020: engineering review

Branch: `fix/767-send-role-from-thread`
Reviewed: the staged diff for the code commit (1 file, +2 -2)
Issue: SonarCloud rule `javascript:S9020` flags `await waitFor(() => expect(screen.getByRole(...)).toBeInTheDocument())` in the test "resends an unsaved message in a thread with the roles left to the thread". `findByRole` already waits and fails with a clearer error.

## Decision

Wait for the Retry button with `await screen.findByRole("button", { name: "Retry" })` and click the element it returns. The later `waitFor` on `mockSendMessage` stays: it waits for a call count, which `findBy` cannot express.

- Options weighed: `await screen.findByRole(...)` without a variable and a second `getByRole` for the click (queries twice), or keep the element in a constant and click it (chosen).
- Consequence accepted: none. The assertion that the button is in the document is implied, because `findByRole` rejects when it is missing.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| None blocking. `ChatScreen.test.js` has no other `waitFor(() => expect(screen.getByRole(...)))`. | 9/10 | Checked with grep. |

## Not in scope

- Any production code. `ChatScreen.jsx` is unchanged.

## What already exists

- `findByRole` is part of the Testing Library `screen` already imported in the file.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Retry button never appears | Test passes silently | Yes, the test still fails (timeout error from `findByRole`) | `findByRole` rejects | A failing test with the query in the message |
| Roles sent on resend | Wrong `hostId` or `guestId` | Yes, same test asserts `hostId: null, guestId: null` | Unchanged | n/a |

## Verification

`src/components/messages/ChatScreen.test.js`: 1 suite, 21 tests passed.
