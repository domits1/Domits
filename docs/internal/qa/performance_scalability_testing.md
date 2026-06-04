# Performance & Scalability Testing

## 1. Purpose

This document defines the Domits performance and scalability testing plan for issue #24. It turns the non-functional requirements from issue #2506 and the critical QA flows from issue #2279 into a practical production testing approach.

The goal is to measure whether Domits can meet its performance targets under realistic traffic while protecting production users, data, bookings, payments, payouts, and host property records.

## 2. Related issues

- Issue #24: Performance & Scalability Testing
- Issue #2506: Non-Functional Requirements and performance targets
- Issue #2279: Critical QA/user flows

## 3. NFR targets / acceptance criteria

| Target area | Acceptance criterion |
| --- | --- |
| API response latency | P95 API responses below 300 ms |
| Frontend page load | Average page load time below 2 seconds |
| Concurrent users | Support 10k concurrent users without errors |
| CPU during peak | p95 CPU below 70% |
| Auto-scaling | Scale within 60 seconds |
| Background jobs | 0% impact on p95 API latency |

Notes:

- The 10k concurrent user target should not be attempted in production without explicit approval, a scheduled test window, live monitoring, and abort criteria.
- API latency should be evaluated through API Gateway and Lambda metrics where available.
- Page load time should be measured separately from API latency using browser/client-side tooling.

## 4. Critical user flows

The testing plan prioritizes the issue #2279 critical flows:

1. Login / authentication
2. Account creation
3. Main guest user flow: search -> select -> book -> confirm
4. Payments / transactions
5. Main host user flow: property setup -> connect bank details -> receive payouts
6. Basic performance
7. Monitoring / alerts functioning

Because production is the requested environment, the first automated tests should focus on read-only and low-risk portions of these flows. Financial and write-heavy steps should be manually validated or tested in a controlled environment unless explicitly approved for production load testing.

## 5. Production safety rules

- Heavy production tests require explicit approval before execution.
- Every production test run must have a named owner, a time window, monitored dashboards, and abort criteria.
- Start with low-rate benchmark tests before any load, stress, spike, or soak test.
- Prefer read-only endpoints for production load testing.
- Use known active property IDs and benign search parameters.
- Do not create real bookings, payments, payouts, accounts, properties, or uploaded assets during automated production load tests unless explicitly approved.
- Do not run destructive mutations in production load tests.
- Use controlled guest and host test accounts for authentication-related checks.
- Coordinate with support/operations before high-traffic tests so production alerts are expected and watched.
- Record test start/end time, traffic pattern, tool used, environment, and all relevant CloudWatch evidence.

## 6. In-scope tests

Safe first production candidates:

- Homepage: `/`
- Search/listings page: `/home`
- `GET /property/bookingEngine/all`
- `GET /property/bookingEngine/byType`
- `GET /property/bookingEngine/listingDetails?property=<known-active-id>`
- `GET /bookings?readType=blockedDates&property_Id=<known-active-id>`
- Search filter API with safe/benign parameters

Controlled auth-related checks:

- Login with controlled accounts only
- Authenticated host read-only dashboard/property reads only
- Authenticated guest read-only dashboard/booking reads only

Client-side performance checks:

- Homepage page load
- Search/listings page load
- Listing detail page load
- Mobile and desktop measurements where possible

## 7. Out-of-scope / delayed tests

Avoid or delay these in production unless explicitly approved:

- Account creation load tests
- Login storms
- Booking creation
- Stripe confirmation/payment intents
- Payout, bank, or Stripe connected account creation
- Property creation
- Image uploads
- Calendar override writes
- Booking cancellation, acceptance, or decline
- Any `DELETE` mutation
- Any `PATCH` mutation

Financial/write flows should be manually validated or tested in a controlled non-production or specially prepared environment unless production execution is explicitly approved.

## 8. Test environment

Primary requested environment: production.

Production testing constraints:

- Use low-risk endpoints first.
- Avoid write and financial side effects.
- Run high-load tests only during an approved test window.
- Monitor CloudWatch in real time.
- Confirm rollback/abort actions before starting.
- Keep all test data identifiable as QA/test data where accounts or IDs are required.

If a staging or dedicated performance environment becomes available, use it for:

- Booking creation load tests
- Payment intent tests
- Account creation tests
- Host onboarding/property creation tests
- Image upload tests
- Calendar mutation tests
- High-concurrency and destructive experiments

## 9. Tooling

Preferred tooling:

- AWS CloudWatch for production monitoring, metrics, logs, alarms, and evidence.
- AWS-native metrics from API Gateway, Lambda, and database services where available.

Useful supporting tools:

- PageSpeed Insights, Lighthouse, or GTmetrix for client-side page performance.
- k6 or Artillery for controlled API load generation if approved.
- Cypress for functional flow validation, not primary load generation.

Current repository status:

- Cypress tooling and specs exist in the web frontend.
- CloudWatch is referenced in internal AWS/QA documentation.
- No dedicated k6, Artillery, JMeter, or performance load test scripts are currently defined for issue #24.
- No new test scripts are added by this document.

## 10. Test scenarios

### Benchmark testing

Purpose: establish a low-risk baseline before load testing.

Suggested scope:

- Load `/`
- Load `/home`
- Fetch all booking engine properties
- Fetch properties by type
- Fetch one listing detail page/API result
- Fetch blocked dates for one known active property

Traffic shape:

- Single user/request checks
- Repeat each check enough times to capture basic latency distribution
- No write actions

Success signals:

- P95 API latency below 300 ms for APIs under test
- No 5XX errors
- No Lambda throttles
- No unexpected timeout or downstream dependency errors

### Client-side performance testing

Purpose: validate average page load time below 2 seconds.

Suggested pages:

- `/`
- `/home`
- `/listingdetails?ID=<known-active-id>`

Tools:

- PageSpeed Insights
- Lighthouse
- GTmetrix

Evidence:

- Page load time
- Largest Contentful Paint
- Total Blocking Time
- Cumulative Layout Shift
- Device/viewport used
- Test date/time and URL

### Low-rate load testing

Purpose: verify stable behavior under gentle concurrent read traffic.

Suggested APIs:

- `GET /property/bookingEngine/all`
- `GET /property/bookingEngine/byType`
- `GET /property/bookingEngine/listingDetails?property=<known-active-id>`
- `GET /bookings?readType=blockedDates&property_Id=<known-active-id>`
- Search filter API with safe/benign parameters

Traffic shape:

- Start with very low concurrency.
- Ramp gradually.
- Keep duration short for the first production run.
- Stop immediately if abort criteria are met.

### Controlled stress testing

Purpose: find the point where latency, errors, throttles, or CPU become unacceptable.

Production safety:

- Requires explicit approval.
- Requires active monitoring.
- Requires rollback/abort criteria.
- Should start with read-only endpoints only.

Do not include:

- Booking creation
- Payment intents
- Stripe confirmations
- Account creation
- Property creation
- Payout or bank actions

### Spike testing

Purpose: check behavior during sudden traffic increases.

Production safety:

- Requires explicit approval.
- Use read-only endpoints first.
- Keep spike size below any agreed production risk threshold.

Monitor:

- API Gateway 5XX and latency
- Lambda throttles and concurrency
- Database CPU/connections/query latency
- Auto-scaling response time

### Soak/endurance testing

Purpose: detect degradation over time.

Production safety:

- Requires explicit approval and an agreed time window.
- Use only read-only endpoints unless a controlled environment is available.
- Watch memory, cold starts, database connections, latency drift, and error rate.

Suggested first soak:

- Low-rate read-only traffic for a limited duration.
- No write, payment, or account creation flows.

### Scalability testing

Purpose: validate scaling behavior and the 60-second auto-scale requirement.

Production safety:

- Requires explicit approval.
- Requires CloudWatch dashboard preparation.
- Requires a defined ramp pattern.

Evidence:

- Traffic ramp timeline
- Scaling event timestamps
- API Gateway latency/error metrics
- Lambda concurrency/throttle metrics
- Database CPU and connection metrics

### Volume testing

Purpose: validate behavior with larger response sizes or larger data volume.

Safe candidates:

- Paginated property listing reads
- Search/listing queries with benign parameters

Avoid:

- Bulk account creation
- Bulk bookings
- Bulk uploads
- Bulk mutation of calendars or properties

### Reliability testing

Purpose: verify stable successful responses during expected production-like usage.

Suggested scope:

- Repeated read-only search/listing/detail checks
- Monitor error rates and latency consistency
- Confirm alerts fire or dashboards show anomalies when thresholds are crossed

### Capacity testing

Purpose: determine how much read traffic production can handle before approaching NFR limits.

Production safety:

- Requires explicit approval for anything beyond low-rate tests.
- Stop before p95 CPU reaches 70%, before sustained 5XX errors, or before Lambda throttling affects users.

### Performance profiling

Purpose: identify bottlenecks behind slow p95 latency.

Use:

- CloudWatch Logs
- API Gateway latency versus integration latency
- Lambda duration and cold start patterns
- Database query latency, CPU, and connections where available

Focus areas:

- Search/listing queries
- Listing detail query
- Blocked dates/availability query
- Background jobs and their impact on API p95 latency

## 11. CloudWatch monitoring checklist

API Gateway:

- `Latency`
- `IntegrationLatency`
- `4XXError`
- `5XXError`
- `Count`

Lambda:

- `Duration`
- `Errors`
- `Throttles`
- `ConcurrentExecutions`
- Timeout errors in logs
- Cold start patterns in logs
- Downstream dependency errors in logs

Database/RDS/DSQL where available:

- CPU
- Connections
- Query latency
- Throttling or saturation indicators
- Error logs

Operational checks:

- Confirm dashboards are open before the test starts.
- Confirm alarm behavior for critical errors.
- Record metric screenshots or exported data.
- Record test start/end timestamps in the same timezone.

## 12. Abort criteria

Abort production testing immediately if any of these occur:

- Sustained or rising 5XX errors
- API p95 latency significantly above 300 ms for the tested endpoint
- User-facing production incident or support escalation
- Lambda throttling affecting tested APIs
- Lambda timeouts or repeated downstream dependency failures
- Database CPU approaches or exceeds the 70% p95 target
- Database connection saturation
- Payment, booking, account, property, or payout side effects are detected unexpectedly
- Monitoring becomes unavailable during the test
- The test exceeds the approved traffic, duration, or scope

## 13. Evidence to collect

For each test run, collect:

- Test date and time
- Environment: production
- Tester/owner
- Tool used
- Exact URL or endpoint
- Request method
- Traffic pattern: concurrency, ramp, duration, request rate
- Test data used, such as known active property ID
- API latency p50/p95/p99 where available
- Error rate and status code distribution
- CloudWatch API Gateway metrics
- CloudWatch Lambda metrics
- Database metrics where available
- PageSpeed/Lighthouse/GTmetrix reports for client-side tests
- Screenshots or exports of dashboards
- Notes on anomalies, cold starts, throttles, dependency errors, or aborts

## 14. Execution order

Recommended order:

1. Confirm approvals, test window, owner, and abort criteria.
2. Confirm known active property IDs and benign search parameters.
3. Prepare CloudWatch dashboards for API Gateway, Lambda, and database metrics.
4. Run client-side baseline tests for `/`, `/home`, and one listing detail page.
5. Run single-request API benchmarks for safe read-only endpoints.
6. Run short low-rate read-only load tests.
7. Review evidence and confirm no production impact.
8. Increase read-only load gradually if approved.
9. Run controlled stress/spike/scalability tests only after explicit approval.
10. Defer write, financial, booking, payout, property creation, upload, and destructive tests until a controlled plan is approved.

## 15. Open questions / approvals needed

- Who approves heavy production load, stress, spike, soak, and scalability tests?
- What is the approved production test window?
- What is the maximum allowed request rate and concurrency for the first production run?
- Which known active property IDs should be used for listing detail and blocked date checks?
- Which controlled guest and host test accounts may be used?
- Are payment and booking creation tests allowed in production at all?
- If payment tests are approved, should Stripe test mode, isolated products, or special test hosts be used?
- Are AWS CloudWatch dashboards and alarms already configured for all target APIs and Lambdas?
- Which database metrics are available for the deployed production database layer?
- What rollback or mitigation actions should be taken if production impact is detected?
- How should final evidence be stored and linked back to issue #24?
