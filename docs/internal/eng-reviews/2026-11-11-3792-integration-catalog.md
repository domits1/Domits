# feat: add the central list of marketplace integrations #3792

Pull request: not opened yet (branch `feature/3792-integration-catalog`, on `acceptance`)
Issue: #3792 (part of #3789, under #433)
Reviewed commit: 0971ba52c
Result: no blocking findings. The commit was reviewed as a staged diff before it was made.

First of three pull requests for the Integration Marketplace MVP: the data. Nothing on the page changes yet; the cards (#3793) and search and filters (#3794) use this list.

Decisions from Stefan and Ilan (9 November 2026): six integrations (PriceLabs, Channex, SiteMinder, Truvi, RemoteLock, WhatsApp), Calry not shown until there is an agreement (#3759), public statuses Available / In development / On request, and "Talk to Sales" to `/contact` instead of a Connect button that does not work yet.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (7/10) | frontend/web/src/features/hostdashboard/hostintegrations/utils/integrationCatalog.js `whatsapp` | WhatsApp is "In development" with a link to `/contact`, while hosts can already connect it. | Product decision (Ilan, Stefan). The card pull request keeps the existing WhatsApp connect flow working. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/hostintegrations/utils/integrationCatalog.js `ON_REQUEST` | No integration uses "On request" yet. | Accepted: it is one of the three agreed public statuses, and the texts exist in every language. |
| P4 (5/10) | frontend/web/src/content/*.json `hostIntegrations` | The German and Spanish texts were translated here, not by a native speaker. | Accepted: they use "du" and "tú" like the rest of the site; Ilan can have them checked. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| catalog | a new integration without a text in one language | yes | the test fails | no, caught before merge |
| catalog | a status or category that does not exist | yes | the test fails | no |
| catalog | Calry or another unapproved integration added by mistake | yes, the id list is pinned | the test fails | no |
| catalog | code changes an entry at run time | yes | the list and its entries are frozen | no |

## What already exists

- The texts follow the existing per-feature blocks in `content/{en,nl,de,es}.json` (like `hostOwners`).
- The contact page `/contact` already exists (`App.js`), so "Talk to Sales" needs no new page.

## Not in scope

- The cards and the WhatsApp connect flow on them: #3793.
- Search and filters: #3794.
- Logos: initials until official logos are approved.
