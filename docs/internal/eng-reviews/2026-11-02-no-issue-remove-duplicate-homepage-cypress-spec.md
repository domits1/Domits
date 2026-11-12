# Enable homepage Cypress spec and remove outdated checks

Pull request: #3755
Issue: None
Reviewed against the current `acceptance` homepage implementation
Result: reviewer feedback addressed; one active homepage spec remains with checks supported by the current markup

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (10/10) | `frontend/web/cypress.config.js:7` | The configured `src/tests/cypress/**/*.cy.js` pattern only discovers files ending in `.cy.js`. The original `homePage.cy 2.js` and `homePage.cy 3.js` filenames did not match it. | Keep one copy as `homePage.cy.js`. |
| P2 (10/10) | `frontend/web/src/pages/home/homePage.js` | The old boats and campers tests queried `.domits-boatContainer`, which is not present in the current homepage implementation. The homepage now renders one `.domits-accommodationGroup` containing the first three accommodations; it does not render separate boats or campers groups. | Remove those two outdated tests rather than replace them with selectors that would not test the same behavior. |

The previous duplicate files had the same Git blob SHA, `bd900c94ed938cef4a348cbb553dc2f45f310591`.

## What changed

- Removed duplicate `homePage.cy 3.js`.
- Renamed the retained file to `homePage.cy.js`, matching the configured Cypress spec pattern.
- Removed the obsolete boats and campers tests that depended on `.domits-boatContainer`.
- Kept the trending-accommodations check and accommodation-navigation check unchanged.

## Evidence

- `frontend/web/src/pages/home/homePage.js` renders the trending list with `.domits-accommodationGroup` and maps `allAccommodations.slice(0, 3)` into `AccommodationCard`.
- `frontend/web/src/pages/home/AccommodationCard.js` renders cards with the `.accocard` class and handles listing navigation through the card link.
- A repository search for `.domits-boatContainer` found it only in the obsolete homepage tests and a commented-out older spec, not in the current homepage implementation.

## Failure modes and follow-up

- The retained homepage checks now use classes present in the current homepage and accommodation-card source.
- The homepage spec has not been executed locally in this environment. Per the review feedback, the Cypress job runs on `acceptance`, not on the PR itself. The acceptance Cypress result should be checked before considering this change verified.
- If the remaining tests fail when run, investigate that separately rather than restoring the obsolete boats/campers checks.

## Not in scope

- Reintroducing separate boats or campers homepage sections.
- Changing homepage implementation or Cypress configuration.
- Rewriting the retained assertions or removing fixed waits.
