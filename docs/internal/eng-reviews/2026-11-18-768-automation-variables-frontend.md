# More variables for automated messages, template editor: engineering review

Branch: `feat/768-automation-variables`
Reviewed: the staged diff for the frontend commit (`AutomationsPage.jsx`, its test, this record)
Builds on: `2026-11-18-768-automation-variables-backend.md`

## Decision

The host's template editor lists the five new variables after the four existing ones, each with a short tooltip, so a host can insert them with one click.

| Variable | Tooltip |
|---|---|
| `{{guestName}}` | Guest's name |
| `{{propertyName}}` | Name of the property |
| `{{checkInDate}}` | Arrival date |
| `{{checkOutDate}}` | Departure date |
| `{{checkInTime}}` | Earliest check-in time |
| `{{checkOutTime}}` | Latest check-out time |
| `{{propertyAddress}}` | Street, number and postal code |
| `{{propertyCity}}` | City of the property |
| `{{numberOfGuests}}` | Number of guests on the booking |

- `VARIABLES` in `AutomationsPage.jsx` is now a list of `{ name, label }`. The button still shows `{{name}}` and inserts it at the end of the template; the label is its `title`. Nothing else in the editor changed.
- The tooltips say what the value is, in the wording the backend uses: `checkInTime` is the start of the check-in window and `checkOutTime` the end of the check-out window, so they read "Earliest" and "Latest".
- No style change. The buttons already sit in a wrapping flex row, so nine buttons wrap on a narrow screen.
- Options weighed: build the list from the `approvedVariables` that the preview endpoint returns (it would never drift, but the buttons would only appear after a first preview and the tooltips would still live in the frontend), or keep the list in the page (chosen, as it is today).
- Consequence accepted: the list is a copy of the backend's approved list. A variable added to the backend does not show up here until it is added here.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` Deploy order. If this ships before the backend commit, a host who inserts a new variable and previews or saves gets the backend's "Unsupported variables: …" message. The page already shows that message. | 8/10 | Accepted. Merge and deploy the backend first. |
| `[P3]` `AutomationsPage.jsx` (`title={label}`): a `title` tooltip does not appear on touch devices or for keyboard focus. | 8/10 | Accepted. The button text is the variable name, and the preview shows the result. |
| `[P3]` The page keeps its own copy of the approved variables (see the decision above). | 8/10 | Accepted. |
| The quick-reply templates in `store/templates.js` use other placeholders (`{{checkIn}}`, `{{numGuests}}`, `{{keyCode}}`). They are not automation variables and the backend would reject them. | n/a | Out of scope, unchanged. |

## Not in scope

- Building the list from the backend's `approvedVariables`.
- Showing a hint when a property lacks check-in or location data.
- Changes to the quick-reply template store.

## What already exists

- The variable buttons, `insertVariable`, and the preview call that shows the backend's unsupported-variable error.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Host inserts a new variable | Button missing or wrong text | Yes | Nine buttons, in order | `{{checkInTime}}` at the end of the template |
| Host hovers a button | No explanation | Yes | `title` on every button | Short tooltip |
| New variable previewed before the backend is deployed | Silent failure | Existing test for the error | Backend error is shown | "Unsupported variables: checkInTime" |
| Preview of a booking whose property lacks data | Preview fails | Backend tests | Backend shows `[Missing: x]` | The marker |

## Verification

New tests were red first (16 failing before the change): the order of the buttons, a tooltip for each of the nine, insertion for each of the five new ones, and the template sent to the preview. `src/features/hostdashboard/hostmessages`: 9 suites, 88 tests passed. Full web suite with `--testTimeout=30000`: 280 suites and 3837 tests passed, 6 suites skipped.
