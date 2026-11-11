# feat: show the marketplace integrations as cards #3793

Pull request: not opened yet (branch `feature/3793-integration-cards`, on top of #3792)
Issue: #3793 (part of #3789, under #433)
Reviewed commits: 9e7be4077 (refactor), d62955f06 (feat)
Result: no blocking findings. Both commits were reviewed as a staged diff before they were made. One small finding was fixed before the commit.

Second of three pull requests for the Integration Marketplace MVP: the page. It shows the six integrations from the catalog (#3792) as cards. Search and filters come in #3794.

The refactor commit moves the WhatsApp connection out of `HostIntegrations.js` into `WhatsAppConnection.jsx` without changing behaviour. The three existing tests in `HostIntegrations.test.js` pass unchanged on it.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (8/10) | frontend/web/src/features/hostdashboard/hostintegrations/components/IntegrationCard.jsx:32 | The card name was an `h3` right under the page `h1`, so screen readers saw a skipped heading level. | Fixed before the commit: the name is an `h2`. The style is on the class, so the look did not change. |
| P4 (7/10) | frontend/web/src/features/hostdashboard/hostintegrations/components/IntegrationCard.jsx:14 `integration.id === "whatsapp"` | WhatsApp is the only card with its own action, picked by id. | Accepted: it is the only integration with a working connect flow. When a second one gets its own flow, the action can move into the catalog. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/hostintegrations/components/IntegrationCard.jsx:15 `#whatsapp-connection` | The WhatsApp card links to an anchor on the same page. This only works with a browser router. | Accepted: the app uses `BrowserRouter` (`App.js:5`, `index.js:8`). A test checks that the section with that id holds the WhatsApp connection. |
| P4 (5/10) | frontend/web/src/features/hostdashboard/hostintegrations/utils/integrationContent.js | Another `contentByLanguage` lookup, like in `Header.js`, `security.js` and `DestinationsMenu.js`. | Accepted: it follows the existing pattern and falls back to English. A shared helper for all pages is out of scope here. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| page | unknown or missing language | yes, Dutch and English are tested | falls back to English | no, the host sees English |
| card | a catalog entry without a text | yes, in the catalog test (#3792) | the test fails | no, caught before merge |
| WhatsApp card | the anchor id and the section id drift apart | yes | both use `WHATSAPP_CONNECTION_ID` | no |
| WhatsApp connection | the WhatsApp API is down | yes, the existing tests | the existing error state of the connection | yes, the existing error message |

## What already exists

- The WhatsApp connect flow is kept as it was and is now its own component.
- The texts come from the `hostIntegrations` block that #3792 added.
- `/contact` already exists, so "Talk to Sales" needs no new page.

## Not in scope

- Search and filters: #3794.
- Logos: the card shows the first letter until official logos are approved.
- The status of WhatsApp ("In development" while hosts can already connect): a product decision for Ilan and Stefan, see the #3792 review.
