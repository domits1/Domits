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
| `/property/bookingEngine/all` | GET | Read-only API benchmark | 10 | 1 | 0.670s | 1.616s | 0% | 10/10 HTTP 200 | Full URL: `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all`. First request was slower than the remaining requests, possibly due to cold start or initial latency. |
| `/property/bookingEngine/byType?type=Boat` | GET | Read-only API benchmark | 10 | 1 | 0.531s | 3.238s | 100% non-2xx | 10/10 HTTP 404 | Full URL: `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byType?type=Boat`. Endpoint is read-only, but `type=Boat` did not return a successful production benchmark response. Treat as invalid benchmark parameter or routing/data issue, not as successful performance evidence. |
| `/property/bookingEngine/listingDetails?property=eb212599-e1f7-40a4-a4e9-07e32f367a47` | GET | Read-only API benchmark | 10 | 1 | 0.630s | 1.368s | 0% | 10/10 HTTP 200 | Full URL: `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=eb212599-e1f7-40a4-a4e9-07e32f367a47`. First request was slower than later requests. |
| `/bookings?readType=blockedDates&property_Id=eb212599-e1f7-40a4-a4e9-07e32f367a47` | GET | Read-only API benchmark | 10 | 1 | 0.634s | 4.537s | 0% | 10/10 HTTP 200 | Full URL: `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=blockedDates&property_Id=eb212599-e1f7-40a4-a4e9-07e32f367a47`. First request was significantly slower than later requests, possibly due to cold start or initial latency. |

API notes:

- Known active property ID used: `eb212599-e1f7-40a4-a4e9-07e32f367a47`
- API base URL(s): `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default`, `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development`
- Search/type parameters used: `type=Boat`, `property=eb212599-e1f7-40a4-a4e9-07e32f367a47`, `readType=blockedDates`, `property_Id=eb212599-e1f7-40a4-a4e9-07e32f367a47`
- Authentication used: None
- Any write or financial endpoint included: No
- Any production user impact observed: No user impact observed from the low-rate read-only curl benchmark.
- Notes: This run used 10 sequential requests per endpoint with concurrency 1. No booking, payment, account, property creation, upload, PATCH, or DELETE actions were executed. The `byType?type=Boat` endpoint returned HTTP 404 for all requests and should not be counted as successful performance evidence.

## 4. CloudWatch evidence checklist

Attach screenshots, exported metrics, or links for each available CloudWatch metric.

| Evidence item | Captured | Value / summary | Link or screenshot reference | Notes |
| --- | --- | --- | --- | --- |
| API Gateway `Latency` | Yes | Latency visible for Property and Booking APIs. Graphs show latency variation and spikes around the selected window. | `PropertyAPIgateway.png`, `BookingAPIgateway.png` | Region: Europe (Stockholm) / `eu-north-1`. Property API checked using API name `Property-API-Develop`; booking API checked using booking API metrics. |
| API Gateway `IntegrationLatency` | Yes | IntegrationLatency visible for Property and Booking APIs. | `PropertyAPIgateway.png`, `BookingAPIgateway.png` | No concurrency/stress conclusion should be made from this low-volume run. |
| API Gateway `4XXError` | Yes | 4XXError included in API Gateway graphs. `byType?type=Boat` returned 10/10 HTTP 404 in curl results. | `PropertyAPIgateway.png`, `BookingAPIgateway.png` | The 404 result should be treated as invalid benchmark parameter or endpoint/routing/data issue. |
| API Gateway `5XXError` | Yes | 5XXError included in API Gateway graphs. No visible 5XX spike was reported from the screenshots. | `PropertyAPIgateway.png`, `BookingAPIgateway.png` | Not confirmed numerically from exported metric data. |
| API Gateway `Count` | Yes | Count visible for Property and Booking API metrics. | `PropertyAPIgateway.png`, `BookingAPIgateway.png` | Total benchmark volume was intentionally low: 10 sequential requests per endpoint. |
| Lambda `Duration` | Yes | Duration checked for Property and Bookings Lambda metrics. Graphs show duration variation and spikes around the selected window. | `PropertyLambda.png`, `BookingsLambda.png` | First curl requests were slower on several endpoints, possibly due to cold start or initial latency. |
| Lambda `Errors` | Yes | Errors checked for Property and Bookings Lambda metrics. | `PropertyLambda.png`, `BookingsLambda.png` | Not confirmed numerically from exported metric data. |
| Lambda `Throttles` | Yes | Throttles checked for Property and Bookings Lambda metrics. No throttles were reported from the screenshots. | `PropertyLambda.png`, `BookingsLambda.png` | Not confirmed numerically from exported metric data. |
| Lambda `ConcurrentExecutions` | Yes | ConcurrentExecutions checked for Property and Bookings Lambda metrics. | `PropertyLambda.png`, `BookingsLambda.png` | Benchmark concurrency was 1; this does not prove scalability or capacity. |
| Database CPU | No / N/A | TBD | TBD | Database metrics were not provided for this evidence set. |
| Database connections | No / N/A | TBD | TBD | Database metrics were not provided for this evidence set. |
| Database query latency | No / N/A | TBD | TBD | Database metrics were not provided for this evidence set. |
| Log anomalies | No / N/A | TBD | TBD | Cold starts, timeouts, and downstream errors were not confirmed from logs in this evidence set. |
| Cold starts | No / N/A | Possible cold start or initial latency inferred from slower first requests, but not confirmed from logs. | TBD | Treat as hypothesis only. |
| Timeout errors | No / N/A | Not confirmed. | TBD | Logs were not provided. |
| Downstream dependency errors | No / N/A | Not confirmed. | TBD | Logs were not provided. |

CloudWatch time range:

- Start: TBD
- End: TBD
- Timezone: Europe (Stockholm) / `eu-north-1`

## 5. NFR comparison

| NFR target | Measured result | Pass / fail | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| API P95 < 300 ms | Successful endpoints had conservative P95 values of 1.616s, 1.368s, and 4.537s in the low-rate curl run | Fail | Read-only API benchmark results table | Failed for successful endpoints in this low-rate run. `byType?type=Boat` returned HTTP 404 and is not counted as successful performance evidence. |
| Average page load < 2 seconds | PageSpeed LCP ranges from 6.1s to 52.9s; GTmetrix homepage LCP is 2.6s and fully loaded time is 8.1s | Fail / Partial | Frontend benchmark results table | Fails PageSpeed for all tested pages and devices; GTmetrix homepage is closer but still above 2s LCP and has high fully loaded time |
| p95 CPU < 70% | Database/compute CPU metrics not provided in this evidence set | N/A | TBD | Cannot assess CPU target from this run. |
| No unexpected errors | Successful endpoints returned 10/10 HTTP 200 with 0% error rate; `byType?type=Boat` returned 10/10 HTTP 404 | Partial | Read-only API benchmark results table, `PropertyAPIgateway.png` | Passed for successful endpoints, but `byType?type=Boat` should be treated as invalid benchmark parameter or endpoint/routing/data issue. |
| No throttles | No throttles were reported from Lambda screenshots, but no numeric export was provided | Partial / Not confirmed numerically | `PropertyLambda.png`, `BookingsLambda.png` | Marked carefully because this is screenshot-based evidence only. |
| No 5XX errors | No visible 5XX spike was reported from API Gateway screenshots, but no numeric export was provided | Partial / Not confirmed numerically | `PropertyAPIgateway.png`, `BookingAPIgateway.png` | Successful curl endpoints returned no 5XX; `byType?type=Boat` returned 404, not 5XX. |

## Controlled load/stress test preparation

### Purpose

The previous API benchmark was intentionally low-rate and sequential only: 10 requests per endpoint, concurrency 1, and no write actions. That run provides useful baseline evidence, but it does not prove scalability, capacity, or readiness for the 10k concurrent user NFR.

The next step is to prepare a controlled production-safe load/stress test using only read-only endpoints first. The goal is to increase confidence carefully while preserving production safety and keeping CloudWatch as the monitoring and evidence source.

### Scope

In scope for the first controlled load/stress test:

- `GET /property/bookingEngine/all`
- `GET /property/bookingEngine/listingDetails?property=<known-active-id>`
- `GET /bookings?readType=blockedDates&property_Id=<known-active-id>`

Excluded from this first controlled production test:

- Booking creation
- Payments
- Account creation
- Login brute-force testing
- Property creation, update, or delete
- Any write endpoint

### Proposed low-risk load levels

| Stage | Load | Duration | Notes |
| --- | --- | --- | --- |
| Baseline | 1 virtual user | 1 minute | Confirms endpoint availability and monitoring before increasing load. |
| Low load | 2 virtual users | 2 minutes | Small increase while watching CloudWatch in real time. |
| Controlled load | 5 virtual users | 2 minutes | Maximum proposed level for the first controlled production test. |

Stop before higher stress unless explicitly approved.

### Abort criteria

Stop immediately if:

- 5XX errors appear
- Lambda throttles appear
- API Gateway latency becomes consistently high
- Error rate is greater than 1%
- CloudWatch alarms trigger
- Production user impact is suspected

### Monitoring requirements

API Gateway:

- `Latency`
- `IntegrationLatency`
- `Count`
- `4XXError`
- `5XXError`

Lambda:

- `Duration`
- `Errors`
- `Throttles`
- `ConcurrentExecutions`

Logs:

- Timeouts
- Unhandled exceptions
- Cold starts / init duration if visible

### Success criteria

For this first controlled test:

- No 5XX errors
- No Lambda throttles
- Error rate <= 1%
- All successful read-only endpoints remain available
- P95 response time recorded
- CloudWatch screenshots captured

### Tooling recommendation

k6 or Artillery are recommended candidates for local traffic generation. AWS-native CloudWatch monitoring should remain the source of production evidence for API Gateway, Lambda, logs, and any available database metrics.

The traffic generator can be a local tool, while AWS-native monitoring is used to validate production behavior. No final traffic-generation tool is selected yet, and no executable load scripts should be added until approval is confirmed.

### Open approvals/questions before execution

- Confirm exact test window.
- Confirm maximum allowed virtual users.
- Confirm whether 5 virtual users is acceptable on production.
- Confirm whether tests should be run outside peak hours.
- Confirm who monitors CloudWatch during the run.

### Result placeholders

| Scenario | Tool | Endpoint(s) | Virtual users | Duration | Request count | Avg response time | P95 response time | Error rate | 5XX count | Throttles observed | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | TBD | TBD | 1 | 1 minute | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Low load | TBD | TBD | 2 | 2 minutes | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Controlled load | TBD | TBD | 5 | 2 minutes | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## 6. Conclusion

Overall result:

- Partially passed

Summary:

- The tested frontend pages loaded successfully in PageSpeed, so no unexpected frontend crash was observed. The frontend page-load NFR is not met: LCP is high across homepage, search/listings, and listing detail, with the worst result on `/home` mobile at 52.9s LCP. GTmetrix completed only for the homepage and reported Grade C, 72% performance, 2.6s LCP, 8.1s fully loaded time, 8.44MB total page size, and 85 requests.
- The read-only API curl benchmark used production endpoints with concurrency 1, 10 sequential requests per endpoint, and no write actions. Successful endpoints returned 10/10 HTTP 200 with 0% error rate, but their conservative P95 values were above the 300 ms API NFR target. `byType?type=Boat` returned 10/10 HTTP 404 and should be treated as an invalid benchmark parameter or endpoint/routing/data issue, not successful performance evidence.
- CloudWatch screenshots were captured for Property API Gateway, Booking API Gateway, Property Lambda, and Bookings Lambda in `eu-north-1`. The screenshots support that API Gateway latency/integration latency and Lambda duration/error/throttle/concurrency metrics were checked, but this low-rate run does not prove scalability, capacity, or 10k concurrent user readiness.
- Controlled load/stress testing is the next planned step and requires explicit execution approval before any traffic generation beyond the documented low-rate benchmark approach.

Follow-up actions:

- Investigate LCP bottlenecks on homepage, `/home`, and listing detail.
- Reduce image payloads and serve properly sized next-gen images.
- Add explicit image dimensions to reduce layout instability.
- Review static asset cache policy.
- Review unused JavaScript and large bundles.
- Investigate `/home` mobile CLS of 0.588.
- Investigate why GTmetrix returns `404 Not Found` for `/home` and listing detail while PageSpeed succeeds.
- Investigate valid production values for `/property/bookingEngine/byType` because `type=Boat` returned HTTP 404.
- Investigate first-request latency on `/property/bookingEngine/all`, listing details, and blocked dates. Confirm whether this is Lambda cold start, database connection initialization, or another initial latency source.
- Export numeric CloudWatch metrics for API Gateway and Lambda to confirm 5XX, throttles, duration, and concurrency values instead of relying only on screenshots.
- Add database CPU, connection, and query latency evidence for the same test window if available.

Risks found:

- High LCP on all tested pages.
- High TBT on PageSpeed results, especially desktop listing/search pages and mobile homepage.
- High CLS on `/home` mobile.
- Large homepage payload in GTmetrix: 8.44MB.
- Image delivery and cache policy issues.
- Possible unused JavaScript impacting load and interactivity.
- API P95 target was missed by successful read-only API endpoints in this low-rate run.
- First request latency spikes appeared on multiple API endpoints.
- `byType?type=Boat` returned HTTP 404 for every request.
- CloudWatch evidence is screenshot-based; numeric metric exports are still needed for stronger reporting.

Recommended next tests:

- Repeat frontend benchmarks after image/cache/bundle improvements.
- Repeat read-only API benchmarks after confirming valid `byType` parameters.
- Capture exported CloudWatch metric data for API Gateway, Lambda, and database metrics during the next low-rate API test.
- Add a second low-rate run to compare first-request latency against warmed requests.
- Add mobile-focused regression checks for `/home` layout stability.

Approval needed before next test run:

- Approval is still needed before any heavy production load, stress, spike, soak, scalability, write-flow, booking, payment, payout, or account-creation testing.
