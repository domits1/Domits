# feat: search and filter the integration marketplace #3794

Pull request: not opened yet (branch `feature/3794-integration-search`, on top of #3879)
Issue: #3794 (part of #3789, under #433)
Reviewed commits: fa54c42bd (filter rules), b6165c06b (controls on the page)
Result: no blocking findings. Both commits were reviewed as a staged diff before they were made. One finding was fixed before the commit.

Last of three pull requests for the Integration Marketplace MVP. The list of integrations came in #3854 and the cards in #3879. This one adds the search, the two filters and the empty state.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | frontend/web/src/content/{de,es}.json `hostIntegrations` | The new texts were only tested in English and Dutch. A missing German or Spanish text would show an empty label without any test failing. | Fixed before the commit: a test in `integrationCatalog.test.js` checks that nl, de and es have exactly the same text keys as English, and that none is empty. |
| P4 (7/10) | frontend/web/src/features/hostdashboard/hostintegrations/utils/integrationFilters.js `filterIntegrations` | The search only looks at the name, not at the description or the category. | Accepted: the issue asks for search by name, and the category has its own filter. A test pins it, so a change is a choice and not an accident. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/hostintegrations/components/IntegrationMarketplace.jsx `role="status"` | The result count is read out by screen readers after every key press. | Accepted: it is `polite`, so it waits until the host stops typing, and it is the usual way to announce a changed result list. |
| P4 (5/10) | frontend/web/src/features/hostdashboard/hostintegrations/utils/integrationFilters.js `optionsFor` | The filters only offer the categories and statuses that an integration uses, so "On request" does not show yet. | Accepted on purpose: a choice that always gives an empty list does not help a host. It shows up by itself when an integration gets that status. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| search | nothing matches | yes | empty state with "Clear filters", focus goes back to the search | yes, clear message |
| search | the host types an accent (trúvi) or extra spaces | yes | accents and spaces are ignored | no, it just finds it |
| filters | search and filters together match nothing | yes | same empty state | yes |
| WhatsApp | the WhatsApp card is filtered out | yes | the WhatsApp connection below stays on the page | no |
| texts | a language misses a new text | yes | the key test fails | no, caught before merge |

## What already exists

- The catalog, statuses and categories from #3854 and the cards from #3879 are reused as they are.
- The texts follow the `hostIntegrations` block in `content/{en,nl,de,es}.json`.
- The controls are native `input type="search"` and `select` with labels, so they work with the keyboard and screen readers without extra code.

## Not in scope

- Keeping the search in the URL, so a filtered list can be shared or survives a refresh: not asked for in the issue.
- Searching on the description: see the finding above.
- Logos: still the first letter until official logos are approved.
