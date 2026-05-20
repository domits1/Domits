# Performance & Scalability Test Results

Template for recording the first production-safe benchmark results for Domits issue #24.

## 1. Test run metadata

| Field | Value |
| --- | --- |
| Date | TBD |
| Tester | TBD |
| Environment | Production |
| Tested URL(s) | TBD |
| Test window | TBD |
| Tools used | TBD |
| GitHub issue | #24 |
| Related NFR issue | #2506 |
| Related QA issue | #2279 |
| Production approval/reference | TBD |
| Abort criteria confirmed before test | Yes / No |
| CloudWatch monitoring active during test | Yes / No |

## 2. Frontend benchmark results

Record PageSpeed, GTmetrix, or Lighthouse results for each production-safe page.

| Page | URL | Tool used | Device | Performance score | LCP | FCP | CLS | TBT | Speed Index | Total page size | Requests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage | `https://www.domits.com/` | PageSpeed / GTmetrix / Lighthouse | Mobile | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Homepage | `https://www.domits.com/` | PageSpeed / GTmetrix / Lighthouse | Desktop | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Search/listings | `https://www.domits.com/home` | PageSpeed / GTmetrix / Lighthouse | Mobile | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Search/listings | `https://www.domits.com/home` | PageSpeed / GTmetrix / Lighthouse | Desktop | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Listing detail | `https://www.domits.com/listingdetails?ID=<known-active-property-id>` | PageSpeed / GTmetrix / Lighthouse | Mobile | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Listing detail | `https://www.domits.com/listingdetails?ID=<known-active-property-id>` | PageSpeed / GTmetrix / Lighthouse | Desktop | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

Frontend notes:

- Known active property ID used: TBD
- Browser/location tested from: TBD
- Network profile, if applicable: TBD
- Any production user impact observed: Yes / No
- Notes: TBD

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
| Average page load < 2 seconds | TBD | Pass / Partial / Fail / N/A | TBD | TBD |
| p95 CPU < 70% | TBD | Pass / Partial / Fail / N/A | TBD | TBD |
| No unexpected errors | TBD | Pass / Partial / Fail / N/A | TBD | Review 4XX/5XX and logs |
| No throttles | TBD | Pass / Partial / Fail / N/A | TBD | Review Lambda throttles |

## 6. Conclusion

Overall result:

- Passed / Partially passed / Failed

Summary:

- TBD

Follow-up actions:

- TBD

Risks found:

- TBD

Recommended next tests:

- TBD

Approval needed before next test run:

- TBD
