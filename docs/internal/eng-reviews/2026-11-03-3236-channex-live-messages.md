# fix(messages): show new Channex guest messages live in the host inbox (#3236)

Pull request: #3741
Issue: #3236
Reviewed commit: `1810caad6`
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | ContactList.jsx | The placeholder list was rebuilt on every update. | Fixed in 69094457e |
| P3 (5/10) | ContactList.jsx | A guest really named "New message" or "Unknown" could be replaced by the placeholder. | Accepted, because it is very unlikely and it behaves as before |
| P3 (7/10) | channexWebhookService.test.js | The test checks that the publisher was called, not that it ran first. | Accepted, because it failed with 0 calls before the reorder |
| P3 (6/10) | channexWebhookService.js | The host may get the push just before the thread's bookingId is set. | Accepted, because it is a live notification |

## Not in scope

- Loading the history on open: handled in a follow-up issue.
- Pushing only inserted messages: the Channex normalizer creates one message per event, so a mixed event can't happen today. Handled in the same follow-up.
- The websocket Lambda: its source isn't in this repo.
