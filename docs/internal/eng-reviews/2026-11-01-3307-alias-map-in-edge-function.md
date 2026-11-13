# #3307 Redirect an alias from a map in the edge function instead of a key value store

Pull request: this one
Issue: #3307
Reviewed commit: 070268008
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (7/10) | docs/internal/tools/static_page_edge_function_runbook.md, step 6 watch | With no compute data from CloudWatch the watch read 0 and passed; one sample from the minute before the publish was enough to count as data. | Fixed in 070268008: compute is read by time window from the publish minute, and data is counted only after it; no data five minutes after the publish rolls back. |
| P2 (9/10) | docs/internal/tools/static_page_edge_function_runbook.md, step 6 watch | The watch parsed timestamps ending in `+00:00`, but the CLI prints them in the local zone (`+01:00`), so every check would have rolled back. | Fixed in 070268008: no timestamp is parsed any more. |
| P2 (8/10) | docs/internal/tools/static_page_edge_function_runbook.md, step 6 publish | The publish read a fresh ETag, so a change to DEVELOPMENT after the replay could be published. | Fixed in 070268008: the publish uses the ETag `get-function` returns for the code it just compared with the merged file. |
| P2 (8/10) | docs/internal/tools/static_page_edge_function_runbook.md, step 6 watch | Removing the last alias always rolled back, because the watch expects a `301`. | Fixed in 070268008: a sixth argument `200` checks a removed alias. |
| P3 (8/10) | docs/internal/tools/static_page_edge_function_runbook.md, step 6 rollback | A failed `update-function` inside `echo "$(...)"` did not stop the rollback, and a failed error-count query read as 0 errors; the configuration was not checked after a rollback. | Fixed in 3c739b2ac and 070268008. |
| P3 (8/10) | backend/infrastructure/static-page-edge/alias-map.mjs:82 | A query result row that lost its tabs was skipped, so an alias could drop out without notice; a doubled column was taken at its first place. | Fixed in 601e5ee47: such rows, a doubled column and a closing `rows: N` that does not match are refused. |
| P3 (8/10) | backend/infrastructure/static-page-edge/viewer-request.js:18 | A prettier run splits the map line once it passes 120 characters. | Accepted: the tests then fail on the map format, so it cannot be published unnoticed. |
| P3 (6/10) | backend/infrastructure/static-page-edge/write-aliases.mjs:16 | `writeFileSync` replaces the file in place, not atomically. | Accepted: a 5 KB file under git, and a broken file fails the tests and shows in the diff step. |
| P3 (5/10) | backend/infrastructure/static-page-edge/alias-map.mjs:5 | Only the `var ALIASES = ...;` line is read; a later assignment to `ALIASES` elsewhere would not be seen. | Accepted: nothing writes one, the function test and review cover the file. |

The mutation check broke each guard of the function, the map module and the parser on a copy. Every mutant was caught except two in `primaryHostFor` that cannot change an outcome: dropping the alias check (a hostname that passes the rule is never an inherited property) and dropping the self check (a self-pointing alias is also a key, so the chain check refuses it). Both stay, to keep the function line for line comparable with the version that read the store.

## Not in scope

- Removing the key value store `domits-static-page-redirects`, the inline policy `static-page-redirects` and the PropertyHandler writer code: they stay inactive while `STATIC_PAGE_REDIRECTS_KVS_ARN` is unset, and a follow-up decides between removing them and letting the reconciler produce the map.
- Producing the map automatically: the map has one alias and changes only when a site gets or loses a custom primary domain, so step 6 is run by hand for now.
- Checking that an alias and its primary belong to the same site: the alias query decides that; the script checks the hostnames, self and chains.
