# Performance & Scalability Test Results

Template for recording the first production-safe benchmark results for Domits issue #24.

## 1. Test run metadata

| Field | Value |
| --- | --- |
| Date | 2026-05-20 |
| Tester | Ameen |
| Environment | Production |
| Tested URL(s) | `https://www.domits.com/`, `https://www.domits.com/home`, `https://www.domits.com/listingdetails?ID=eb212599-e1f7-40a4-a4e9-07e32f367a47` |
| Test window | PageSpeed/GTmetrix benchmark only, no load traffic generated |
| Tools used | PageSpeed Insights, GTmetrix |
| GitHub issue | #24 |
| Related NFR issue | #2506 |
| Related QA issue | #2279 |
| Production approval/reference | Supervisor confirmed production testing; this run only used external benchmark tools |
| Abort criteria confirmed before test | N/A, no load/stress traffic generated |
| CloudWatch monitoring active during test | No |

## 2. Frontend benchmark results

Record PageSpeed, GTmetrix, or Lighthouse results for each production-safe page.

| Page | URL | Tool used | Device | Performance score | LCP | FCP | CLS | TBT | Speed Index | Total page size | Requests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage | `https://www.domits.com/` | PageSpeed Insights | Mobile | 35 | 20.2s | 2.0s | 0.059 | 2,170ms | 11.6s | TBD | TBD | Accessibility 65, Best Practices 96, SEO 100 |
| Homepage | `https://www.domits.com/` | PageSpeed Insights | Desktop | 37 | 6.4s | 1.0s | 0.001 | 1,130ms | 3.4s | TBD | TBD | Accessibility 80, Best Practices 92, SEO 100 |
| Homepage | `https://www.domits.com/` | GTmetrix | Desktop / default GTmetrix run | 72% performance, Grade C | 2.6s | TBD | 0 | 143ms | TBD | 8.44MB | 85 | Structure 83%, fully loaded 8.1s |
| Search/listings | `https://www.domits.com/home` | PageSpeed Insights | Mobile | 7 | 52.9s | 9.1s | 0.588 | 1,570ms | 12.2s | TBD | TBD | Accessibility 63, Best Practices 96, SEO 92 |
| Search/listings | `https://www.domits.com/home` | PageSpeed Insights | Desktop | 36 | 19.7s | 0.4s | 0.002 | 1,830ms | 3.7s | TBD | TBD | Accessibility 76, Best Practices 92, SEO 92 |
| Listing detail | `https://www.domits.com/listingdetails?ID=eb212599-e1f7-40a4-a4e9-07e32f367a47` | PageSpeed Insights | Mobile | 38 | 34.1s | 2.0s | 0.011 | 1,580ms | 10.4s | TBD | TBD | Accessibility 61, Best Practices 96, SEO 92 |
| Listing detail | `https://www.domits.com/listingdetails?ID=eb212599-e1f7-40a4-a4e9-07e32f367a47` | PageSpeed Insights | Desktop | 38 | 6.1s | 0.5s | 0 | 1,770ms | 3.5s | TBD | TBD | Accessibility 74, Best Practices 92, SEO 92 |

Frontend notes:

- Known active property ID used: `eb212599-e1f7-40a4-a4e9-07e32f367a47`
- Browser/location tested from: TBD
- Network profile, if applicable: TBD
- Any production user impact observed: No frontend crash observed during successful PageSpeed runs.
- GTmetrix note: GTmetrix completed for the homepage only. GTmetrix returned `404 Not Found` for `/home` and the listing detail URL, while PageSpeed tested both successfully.
- GTmetrix homepage main issues: enormous network payload of 8.44MB, missing explicit image width/height, not all resources using HTTP/2, inefficient static asset cache policy, images not consistently served in next-gen formats, offscreen images not deferred, and improperly sized images.
- Performance risks found: high LCP across all tested pages, high TBT, high CLS on `/home` mobile, image delivery issues, cache policy gaps, and likely unused JavaScript.
- Notes: Frontend page-load NFR is not met by the current production benchmark data. Homepage GTmetrix LCP is closer to target than PageSpeed, but fully loaded time and page size remain high.

## 3. Read-only API benchmark results

Only use production-safe read-only endpoints unless additional approval is documented.

| Endpoint | Method | Test type | Request count | Concurrency | Average response time | P95 response time | Error rate | Status codes | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/property/bookingEngine/all` | GET | Benchmark / low-rate load | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/property/bookingEngine/byType` | GET | Benchmark / low-rate load | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/property/bookingEngine/listingDetails?property=<known-active-id>` | GET | Benchmark / low-rate load | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/bookings?readType=blockedDates&property_Id=<known-active-id>` | GET | Benchmark / low-rate load | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

API notes:

- Known active property ID used: TBD
- API base URL(s): TBD
- Search/type parameters used: TBD
- Authentication used: None / Controlled test account / Other
- Any write or financial endpoint included: No
- Any production user impact observed: Yes / No
- Notes: TBD

## 4. CloudWatch evidence checklist

Attach screenshots, exported metrics, or links for each available CloudWatch metric.

| Evidence item | Captured | Value / summary | Link or screenshot reference | Notes |
| --- | --- | --- | --- | --- |
| API Gateway `Latency` | Yes / No / N/A | TBD | TBD | TBD |
| API Gateway `IntegrationLatency` | Yes / No / N/A | TBD | TBD | TBD |
| API Gateway `4XXError` | Yes / No / N/A | TBD | TBD | TBD |
| API Gateway `5XXError` | Yes / No / N/A | TBD | TBD | TBD |
| API Gateway `Count` | Yes / No / N/A | TBD | TBD | TBD |
| Lambda `Duration` | Yes / No / N/A | TBD | TBD | TBD |
| Lambda `Errors` | Yes / No / N/A | TBD | TBD | TBD |
| Lambda `Throttles` | Yes / No / N/A | TBD | TBD | TBD |
| Lambda `ConcurrentExecutions` | Yes / No / N/A | TBD | TBD | TBD |
| Database CPU | Yes / No / N/A | TBD | TBD | TBD |
| Database connections | Yes / No / N/A | TBD | TBD | TBD |
| Database query latency | Yes / No / N/A | TBD | TBD | TBD |
| Log anomalies | Yes / No / N/A | TBD | TBD | Cold starts, timeouts, downstream errors |
| Cold starts | Yes / No / N/A | TBD | TBD | TBD |
| Timeout errors | Yes / No / N/A | TBD | TBD | TBD |
| Downstream dependency errors | Yes / No / N/A | TBD | TBD | TBD |

CloudWatch time range:

- Start: TBD
- End: TBD
- Timezone: TBD

## 5. NFR comparison

| NFR target | Measured result | Pass / fail | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| API P95 < 300 ms | TBD | Pass / Partial / Fail / N/A | TBD | TBD |
| Average page load < 2 seconds | PageSpeed LCP ranges from 6.1s to 52.9s; GTmetrix homepage LCP is 2.6s and fully loaded time is 8.1s | Fail / Partial | Frontend benchmark results table | Fails PageSpeed for all tested pages and devices; GTmetrix homepage is closer but still above 2s LCP and has high fully loaded time |
| p95 CPU < 70% | TBD | Pass / Partial / Fail / N/A | TBD | TBD |
| No unexpected errors | TBD | Pass / Partial / Fail / N/A | TBD | Review 4XX/5XX and logs |
| No throttles | TBD | Pass / Partial / Fail / N/A | TBD | Review Lambda throttles |

## 6. Conclusion

Overall result:

- Partially passed

Summary:

- The tested pages loaded successfully in PageSpeed, so no unexpected frontend crash was observed. The frontend page-load NFR is not met: LCP is high across homepage, search/listings, and listing detail, with the worst result on `/home` mobile at 52.9s LCP. GTmetrix completed only for the homepage and reported Grade C, 72% performance, 2.6s LCP, 8.1s fully loaded time, 8.44MB total page size, and 85 requests. No production load/stress traffic was generated in this benchmark run. API benchmark results and CloudWatch evidence are still TBD for the next step.

Follow-up actions:

- Investigate LCP bottlenecks on homepage, `/home`, and listing detail.
- Reduce image payloads and serve properly sized next-gen images.
- Add explicit image dimensions to reduce layout instability.
- Review static asset cache policy.
- Review unused JavaScript and large bundles.
- Investigate `/home` mobile CLS of 0.588.
- Investigate why GTmetrix returns `404 Not Found` for `/home` and listing detail while PageSpeed succeeds.

Risks found:

- High LCP on all tested pages.
- High TBT on PageSpeed results, especially desktop listing/search pages and mobile homepage.
- High CLS on `/home` mobile.
- Large homepage payload in GTmetrix: 8.44MB.
- Image delivery and cache policy issues.
- Possible unused JavaScript impacting load and interactivity.

Recommended next tests:

- Repeat frontend benchmarks after image/cache/bundle improvements.
- Run controlled read-only API benchmark tests for safe endpoints.
- Capture CloudWatch evidence for API Gateway, Lambda, and database metrics during low-rate API tests.
- Add mobile-focused regression checks for `/home` layout stability.

Approval needed before next test run:

- Approval is still needed before any heavy production load, stress, spike, soak, scalability, write-flow, booking, payment, payout, or account-creation testing.
