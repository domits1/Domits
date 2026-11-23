# Traveler review filters and sorting [#90]

Pull request: https://github.com/domits1/Domits/pull/3895
Issue: https://github.com/domits1/Domits/issues/90

## Review fixes

- The public review endpoint preserves `review_count` as the property's total eligible published review count. Its unfiltered aggregate calculates both the total and overall rating. `matching_count` reports the filtered count and determines `next_offset`.
- The listing displays `matching_count` above the filtered results, including the empty state, and passes the unfiltered `review_count` to `ReviewsSection` beside the overall rating.
- Invalid rating and date ranges show an inline message and disable Apply filters. Submission also checks the range. Date inputs constrain each other with `min` and `max`; clearing or correcting filters restores submission. These errors no longer reach the server and its Retry UI.
- The backend filter allowlist uses a Set. Loading uses a semantic output element with its implicit status role. Removed the redundant remount comment; the property key and property-switch test remain.

## Compatibility and date semantics

A repository-wide search found one production caller of `/properties/{propertyId}/reviews`: `frontend/web/src/features/review/services/reviewAPI.js`, used by `PublicReviews`. It sends `offset` and the five supported filters, omitting empty values. No cache busters or tracking parameters were found. Unknown query parameters continue to return 400. Callers outside this repository have not been verified.

Selected dates are interpreted as inclusive UTC calendar days: From date starts at 00:00 UTC, and To date ends at the following midnight, exclusively. The browser presents the date input in the guest's locale; this does not make the query boundaries local-time boundaries. No timezone conversion was introduced.

`ReviewsSection` is imported by `PublicReviews` and its component tests from its current feature-root location. No references to the previous `components/ReviewsSection` path were found.

## Verification

- Backend: `npm test -- --runInBand test/ReviewSystem/publicReviews.test.js` — 38 tests passed. Coverage includes an unfiltered total of 23 with 0 or 2 matching reviews and no next page, as well as generated SQL ensuring filters never affect the summary aggregate.
- Frontend: `npm test -- --watchAll=false --runInBand --testPathPattern='PublicReviews.test.js|publicReviewsAPI.test.js|ReviewsSection.test.js|listingDetails2'` with CI=true — 28 tests passed across four suites. Coverage includes distinct total/matching counts, preserving the total beside the rating, invalid rating/date ranges, recovery after correction, pagination, chip removal, collapse/expand, and property switches.
- `git diff --check` passed.
- The PR title now includes `[#90]`.
- Desktop/mobile screenshots could not be captured: headless Chrome produced no files in the sandbox, and permission to run it outside the sandbox was declined. No screenshots are attached. Sonar was not rerun; the two reported code patterns were updated directly.
