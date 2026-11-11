# #3099 Store a static page for each site page

Issue: #3099
Reviewed: the staged diff of each commit on `elite-static-page-keys`, up to d4b02b1ed, and the whole branch with the next pull request before opening
Result: 0 blocking

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | fakeSitesBucketClient.js, `writes` | It lists the put and delete calls that were sent, also one S3 refused. A reader could take it for the writes that happened. | Accepted: every test that uses it also checks the bucket contents. |
| P3 (6/10) | fakeSitesBucketClient.js, `beforeNext` | It matches on the key only, so it cannot target a listing by its prefix. | Accepted: no test needs it. |
| P3 (6/10) | staticPageWorker.test.js, `buildBucket` | A second in-memory bucket, without listing or conditional delete. | Accepted for now: replacing it would rewrite older tests in this pull request. |
| P3 (8/10) | staticPageStore.js, `putSitePage` | No caller yet. | Accepted: the plan puts the write side of the store here; the worker change that builds the pages calls it. |
| P3 (6/10) | staticPageStore.js, `#eachObject` | The cap message says "refusing to reconcile blindly", also for the listing of one host. | Accepted: only reachable above 20000 objects under one host. |
| P3 (9/10) | staticPageStore.js, `listSitePages` | A check that the listed hostname is the asked one could never be false: the prefix ends in `/pages/` and a hostname has no `/`. | Removed before the commit. |

## Decisions

- The slugs are the fixed list `gallery`, `accommodation`, `contact-us`, the paths of the site pages in the frontend page table. A new page is a new entry here and in the edge function.
- The hourly listing returns site pages apart (`sitePages`) instead of in `hostnames`, so "a published site without its main page" keeps meaning the main page.
- Today's results are pinned in a test-only first commit, on the real store against an in-memory S3 fake. Any later change to what the jobs write must update those tests in the same commit.
- The live role of `PropertyHandler` could not be read (the AWS session had expired). The repository's writer policy covers `sites/by-host/*` for get, put, delete and list.

## Not in scope

- Removing site pages with a site: the next pull request, `elite-static-page-removal`.
- Writing site pages and the plan check: the worker change that builds them.
- Serving them: the edge function change.

## Mutation check

Run on a copy outside the worktree, one mutant at a time. Caught: site pages reported as rejected, any slug accepted, the hostname not checked in the file name, the listed hostname not checked, the listing of one host without `/pages/`, a site page written as xml, the delete ignoring the ETag.

## Second review

A second review read the diff of this pull request and the next one together. It agreed on the file names, that one host never reaches another host's files, that the hourly listing skips exactly the fixed site pages and still reports every other file, on the races, and that there are no comments in code and no layering break. Its one blocking point is in the next pull request (the listing during a withdrawal) and is fixed there. Non-blocking for this one:

- The S3 fake gives a new ETag on every write, also for identical bytes, so the real case where a rewrite keeps its ETag is not exercised. Accepted: the runbook already describes that case, and the repair step queues such a site again in the same run.
- `listPageHostnames` now returns `sitePages: {}` next to the old fields. Only the reconciler reads it.
