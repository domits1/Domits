# #3053 List the destination sitemap in robots.txt

Pull request: #3746
Issue: #3053
Reviewed commit: c7e70d659 and d5efc2116
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | frontend/web/public/robots.txt:25 | `https://www.domits.com/sitemap-destinations.xml` answers 404 until step 8 of `destination_pages_runbook.md` is done. A release to `main` before that points crawlers at a sitemap that does not answer yet. Nothing is blocked, but the sitemap is reported as an error. | Accepted. Merge only after step 8 printed `OK`; this is stated in the pull request. |
| P3 (6/10) | frontend/web/public/robots.txt | The CDN keeps `robots.txt` until the next deployment of the branch, so the line shows on www only after the release to `main` is deployed. | Accepted. The pull request lists the check after the release. |
| P3 (4/10) | frontend/web/src/features/seo/tests/crawlFiles.test.js:123 | Three existing tests filter `Disallow:` lines by prefix, the new check parses them on its own. | Accepted. Unifying them means changing tests outside this change. |
| P3 (4/10) | frontend/web/src/features/seo/tests/crawlFiles.test.js:18 | The route list has no path with a trailing slash. A rule that blocks only that variant would not fail the test; it would not take the canonical page out of the index. | Accepted. |

## Failure modes

- A later `Disallow` rule that touches a destination route or the destination sitemap: the crawlability test fails in the web suite.
- The new `Sitemap:` line on another host than www, over `http`, or with another path: the sitemap test fails.
- The destination sitemap line copied to the robots.txt of the direct booking websites: the existing test for `public-sites/robots.txt` fails.

## Not in scope

- A different robots.txt per host. `www.domits.com` and `acceptance.domits.com` serve the same static file, and the existing `sitemap.xml` line already names www on both.
- A sitemap index. Two `Sitemap:` lines are valid, so the existing `sitemap.xml` stays as it is.
- Submitting the sitemap in Search Console, which is a live step after the release.
