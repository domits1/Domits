# #3307 Invalidate a static page on CloudFront once the worker has written it

Pull request: the pull request of branch `static-page-publish-invalidation`
Issue: #3307
Reviewed commit: 2b4cad17d
Result: no blocking findings

After a publish the worker wrote the new page to S3 but left the cached copy on CloudFront, so a visitor could get the previous page for up to 5 minutes after the worker tick (the page is stored with `public, max-age=300`). Found on www.villasensual.nl on 18 Nov. The cache key is the URI after the viewer-request function, so the invalidation must name `/sites/by-host/<hostname>/index.html`; `/` and `/index.html` alone do not reach the cached page.

The worker invalidates only after `markPageActive` succeeded, so a failed or slow invalidation can never fail or repeat the build. A build that failed or was superseded invalidates nothing; the retry or the newer job does. Tests: 8 new, 6 of them fail without the change. Mutants: 4 (invalidate on any outcome, drop the errors, let a throw through, invalidate before the page is active), all caught.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `staticPageWorker.js:138` | The worker asks the withdrawal object for the invalidation after a publish, a name that fits a withdrawal better. | Accepted: one tenant lookup for both, and no new wiring in the controller. A class of its own is a later refactor. |
| P3 (8/10) | `propertyController.js:1981` | A refused invalidation is reported in the run summary, so the invocation fails and the alarm fires while the page is `ACTIVE`. | Accepted: the same as a redirect that cannot be removed and an invalidation after a withdrawal. The schedule has no retries, so it fires once. |

## Not in scope

- Invalidating the sitemap: it keeps its `max-age=300`.
- Elite site pages under `pages/<slug>.html`: the worker does not write them yet.
- Rebuilding every page after a frontend deploy: that is `STATIC_PAGE_REGENERATE_ON_DEPLOY` in `deploy-direct-booking-sites.yml`, set on 19 Nov.
