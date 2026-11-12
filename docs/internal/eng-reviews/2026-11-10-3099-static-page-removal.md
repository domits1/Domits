# #3099 Remove the static site pages of a site that goes offline

Issue: #3099
Reviewed: the staged diff of each commit on `elite-static-page-removal`, and the whole branch before opening, up to c73a81379
Result: 1 blocking, fixed

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | staticPageWithdrawal.js, `withdraw` | Second review: the new listing of a host's site pages was awaited before the first delete and could throw (a missing permission, an S3 error). Every existing host would then get a new failure: a listing delete answering 503, an unpublished page staying up until the retry. | Fixed in c73a81379: a listing that fails is reported as `SITE_PAGES_UNLISTED` and the withdrawal goes on exactly as today; the hourly check removes the site pages it could not list. |
| P2 (5/10) | live role of `PropertyHandler` | The listing needs `s3:ListBucket` with the prefix `sites/by-host/<hostname>/pages/`. The repository's writer policy allows it (the same statement as the hourly check); the live role could not be read. | Since c73a81379 a missing permission no longer changes what a host sees; it would show as `SITE_PAGES_UNLISTED` in the worker's run. Checked read-only before merge, see the pull request. |
| P2 (9/10) | staticPageWithdrawal.js, `withdraw` | When an attempt stops after removing some site pages, the retry lists only what is left, so the removed ones are never invalidated. | Accepted: their cached copy expires within `max-age=300`, like a failed invalidation today, and nothing serves them until the edge change. Written in the runbook. |
| P2 (8/10) | staticPageWithdrawal.js, `removePages` | A host with only site pages left has no listed ETag for its main page, so that delete is unconditional. A build that writes the main page in that moment loses it. | Accepted: the repair step queues that site again in the same run, as it does today for a page listed without an ETag. |
| P3 (7/10) | staticPageReconciler.js, summary | `stored` counts main pages, the empty-database message counts hosts with any page. | Accepted: they differ only once site pages exist. |
| P2 (9/10) | staticPageBucket.test.js | No test kept a host's site pages when its main page was rewritten or it was published again, and none queued a published host with site pages but no main page; both mutants survived. | Fixed in b8be675f2. |

## Decisions

- Order per host: list the site pages, delete the main page, delete the site pages, empty the sitemap. The sitemap is emptied after every page it could list.
- A failing listing never stops a withdrawal, because every host makes that call: it is reported and the rest happens as today. A failing delete of a site page still stops it, like a failing delete of a main page today; that only happens once site pages exist.
- In the hourly check the main page decides: only when its conditional delete succeeds are the host's site pages deleted, each conditional on its own ETag.
- A host with only site pages left counts as stored for removal and for the empty-database guard, but not for "missing a page".
- Site page paths are invalidated only for files that were removed, so a withdrawal without site pages sends exactly today's five paths.

## Not in scope

- Site pages of a published site whose Elite ended: the worker change that builds the pages, which reads the plan.
- A sitemap left behind when its write fails after the pages are gone: the hourly check skips sitemaps, so it cannot finish that host. This gap exists on acceptance today.
- The worker change that writes site pages must not rely on the repair step for a removal that failed halfway: only hosts whose removal finished are queued again, and "missing a page" means missing the main page.

## Mutation check

Run on a copy outside the worktree, one mutant at a time. Caught: a failed listing stops the withdrawal, a failed listing is not reported, the worker drops the site page failures, a listing delete or a website delete does not log them; the withdrawal keeps the site pages, lists after the first delete, empties the sitemap before the site pages, invalidates no page paths, only the file path, or drops the removed pages; the hourly check keeps the site pages, deletes them without the ETag, before the main page decides (two places), counts a kept page as removed, records them only after all deletes; hosts with only site pages are no orphans, the empty-database guard counts main pages only, the site pages are not passed on, a published host without a main page is not queued, `stored` counts site pages. Two survived first (deleting before the main page decides was caught only by write order; a published host without a main page not queued) and are caught since b8be675f2.

## Second review

A second review read the diff of both pull requests together. It agreed on the file names, host isolation, the hourly check, the races and the tests through the real store; no comments in code, no layering break. One blocking point, the listing that could stop a withdrawal, fixed in c73a81379. Non-blocking points it raised, all accepted:

- A withdrawal that stops after removing some site pages leaves those out of the retry's invalidation; see the P2 above.
- The bare paths `/gallery`, `/accommodation`, `/contact-us` are invalidated on the host's tenant, which a fallback host shares with the others, as `/` and `/index.html` are today. It empties more cache than needed, never another host's files, and only when a site page was removed.
- The S3 fake gives a new ETag on every write, so the real case where a rewrite with identical bytes keeps its ETag is not exercised; the repair step covers it, as the runbook says.

A follow-up review of c73a81379 found nothing blocking: with a failed listing the writes, their order and the invalidation paths are those of acceptance on all three callers, the worker's run fails loudly, the other two log it, and the hourly check removes what was left. Accepted: the listing still adds one request before the first delete, so a withdrawal takes slightly longer; the later cleanup still needs a successful hourly run and keeps the existing refusal when the database lists no domain.
