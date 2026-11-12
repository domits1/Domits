# #3053 Destination pages use www as the canonical host on every host

Pull request: this one
Issue: #3053
Reviewed commits: d8c3466db, 05865bfb7, 3deba31e8 and the documentation commit that adds this file, each as a staged diff before its commit, then the whole branch against `acceptance`
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | backend/functions/PropertyHandler/business/service/destinationPageRequest.js:4 | `DESTINATION_SITE_ORIGIN` repeats the `DEFAULT_SITE_ORIGIN` of destinationPageBuilder.js:5 and destinationSitemapBuilder.js:8; there were three copies before this change too. | Accepted. One constant means moving it into the builder, because destinationPageRequest.js already imports from it; that is a refactor of its own. |
| P3 (6/10) | backend/functions/PropertyHandler/business/service/destinationTreeService.js:112, :121 | The `siteOrigin` parameter now always gets the same value. | Accepted. It keeps the builder tests for the trailing slash and the origin check, and keeps this change small. |
| P3 (6/10) | backend/functions/PropertyHandler/business/service/destinationPageBuilder.js:93 | The `All destinations` link on the `404` is relative. Opened on the raw `execute-api` URL, it points at the API root without the `/default` stage. | Accepted. Only the runbook checks use that URL; visitors reach `/destinations` through Amplify on their own host. |
| P3 (5/10) | backend/test/PropertyHandler/destinationPageService.test.js:39, :51 | The tests pass `forwardedHost` to a service that no longer takes it. | Accepted. The test names say why; they are the only tests at this layer that fail when the service reads a host again. |
| P3 (5/10, unsure) | docs/internal/tools/destination_pages_runbook.md:16 | The sitemap on `acceptance.domits.com` lists `www.domits.com` URLs. The sitemap protocol says crawlers skip URLs on another host than the sitemap; the repository cannot show how each crawler handles it. | Accepted. The acceptance sitemap is not named in `robots.txt` or submitted anywhere, and the static `/sitemap.xml` on acceptance already lists `www.domits.com` URLs. |
| P3 (6/10) | docs/internal/tools/destination_pages_runbook.md:16, :132 | The runbook still described the host taken from `X-Forwarded-Host` after the code change. | Fixed in the documentation commit. |

## Decisions

- Context: `acceptance.domits.com` and `www.domits.com` reach the same `PropertyHandler` through the same Amplify rules, so both hosts serve the same destination pages, and the rest of the app already names `https://www.domits.com` as the canonical on every host.
- Options: keep the host list (acceptance names itself as canonical), answer `404` for the sitemap on other hosts (the host decides again), or always use `www` (option B).
- Choice: always `www` for the canonical, `og:url`, the breadcrumb data and the sitemap URLs. The request host is not read on these routes.
- Consequences: the body no longer depends on the host, so a cache that keys on the host and one that does not give the same answer. Links inside the pages, the `404` included, stay relative, so testers stay on acceptance and visitors stay on www; search engines follow the canonical.

## Not in scope

- `getRequestHostHeaderValue` in backend/functions/PropertyHandler/controller/propertyController.js:192 stays. There the host names the direct booking website to render; it is not a canonical for marketplace pages.
- `noindex` for the whole acceptance site: not part of option B.
- `hreflang`: the pages are English only and have none.
- One shared origin constant and removing the builders' `siteOrigin` parameter: a refactor of its own.
