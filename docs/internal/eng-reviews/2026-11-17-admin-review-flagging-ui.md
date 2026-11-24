# Admin review flagging UI: engineering review

Branch: `feat/admin-review-flagging-ui`.
Base: `origin/feat/admin-review-flagging` (`76e69200f`, local fetched ref).
Reviewed commit: `76c5e2016`.
Issue: #90 (provided in the PR-description discussion).
Pull request: not supplied.
Result: two open P2 findings; no fixes or risk acceptance implied.

Applied `.claude/skills/eng-review/SKILL.md` to the UI diff against its backend
base. An independent reviewer inspected the same diff and confirmed both
findings below. No disagreements were reported. Only this review record was
added; application code and tests were not modified.

## Findings and decisions

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `frontend/web/src/features/review/views/ReviewApprovalPage.js:148` | Search and Rating filters remain enabled on the Moderation queue tab but do not filter that queue. | Open. Recommend hiding the review-only toolbar on the moderation tab, with a regression test. Implementing server-backed moderation filtering is a larger alternative. |
| P2 (8/10) | `frontend/web/src/features/review/components/ReviewModerationQueue.js:63` | A successful HTTP response with a malformed queue payload can crash rendering instead of showing the error/retry state. | Open. Recommend validating the GET moderation response shape in the API helper and rejecting malformed responses; add a regression test. |

### Verification: inactive filters

- `ReviewApprovalPage.js:89`: `() => reviews.filter((review) => matchesReviewSearch(review, query) && matchesRating(review, rating)),`
- `ReviewApprovalPage.js:153`: `aria-label="Search reviews"`
- `ReviewApprovalPage.js:156`: `onChange={changeFilter(setQuery)}`
- `ReviewApprovalPage.js:171`: `<select id="review-rating" value={rating} onChange={changeFilter(setRating)}>`
- `ReviewApprovalPage.js:216`: `<ReviewModerationQueue />`
- `ReviewModerationQueue.js:21`: `getReviewFlags({ status, offset, limit: PAGE_SIZE }).then((page) => {`

The toolbar is rendered unconditionally, but its state only filters `reviews`.
The moderation component receives neither value and fetches only status/offset/
limit. Selecting a rating can display `Filters (1)` without changing moderation
results. No error or explanation tells the moderator the controls do nothing.

### Verification: malformed successful response

- `reviewAPI.js:43`: `const payload = await parseResponse(response);`
- `reviewAPI.js:44`: `if (!response.ok) throw reviewApprovalError(response, payload, fallback);`
- `reviewAPI.js:45`: `return payload;`
- `ReviewModerationQueue.js:22`: `if (active) setResult(page);`
- `ReviewModerationQueue.js:63`: `{result?.flags.length === 0 && <p className={styles.emptyState}>No {status.toLowerCase()} review flags.</p>}`

For HTTP 200 with `{}` or an array, `result` is truthy but `result.flags` is
undefined; reading `.length` throws during render. The promise catch does not
handle render errors. Validate an array of flags and a valid nullable continuation
offset before storing the page. The server currently returns the expected shape;
this finding concerns response-contract failure and deployment drift.

## Four review passes

- Architecture: UI components reuse the authenticated review API transport;
  backend remains authoritative for allowlist and approver-role authorization.
  Modal submission transitions to the dedicated moderation tab. A null review
  scope avoids fetching the ordinary queue while that tab is active.
- Code quality: duplicate mutation refs, disabled controls, effect cleanup and
  visible request errors are present. The two component boundary defects above
  need decisions. Dialog uses native modal semantics; browser behavior was not
  verified in this review.
- Tests: the new page test covers flag submission, resolution and changing to
  resolved status. The new UI lacks dedicated tests for moderation load failure/
  retry, resolve/flag rejection, cancellation, pagination and malformed payloads.
  These are coverage limitations, not claims that all those paths are broken.
- Performance: moderation loads eight rows plus server-side continuation, rather
  than downloading the full queue. Requests suppress obsolete state updates
  after cleanup but do not abort transport. Backend offset-pagination behavior
  remains a dependency limitation, described below.

## What already exists

Reuse `requestReview`, token acquisition, response parsing and error status
helpers; reuse the review page, CSS Module, tab keyboard navigation and details
panel. Backend flag reasons, moderation scope and transactional approval holds
are supplied by the backend base. No new packages or backend endpoints are
introduced by this UI diff.

## Failure modes

| New path / failure | Handling and visible result | Test coverage |
|---|---|---|
| Flag submission succeeds | Closes dialog, shows notice and opens moderation queue. | New page happy-path test. |
| Flag submission rejects / duplicate pending flag | Dialog displays alert, permits another attempt; mutation ref prevents duplicate in-flight submissions. | No new rejection/duplicate test. |
| User cancels modal | Cancel/Escape close when not submitting; cancellation disabled while submitting. | Not covered; native focus behavior not browser-verified. |
| Moderation GET rejects | Alert and Retry button. | Not covered by the new moderation test. |
| Moderation GET succeeds with invalid shape | Can throw during render; normal retry state is bypassed. | Missing regression; open finding. |
| Resolve rejects | Alert; row remains available and buttons unlock. | Missing rejection/retry regression. |
| Resolve succeeds | Notice and page reload; moves back a page if resolving its sole row. | Happy path on first page only. |
| Status/page request races | Effect cleanup ignores old responses. | No new race/pagination test. |
| User searches/filters moderation | Enabled controls do not affect results or explain the limitation. | Missing regression; open finding. |

No path with neither handling nor a visible symptom was otherwise identified.

## Data flow

```text
Review details ▶ Flag for review ▶ native dialog
                                    ▼
                           POST /reviews?scope=moderation
                                    ▼
                         Notice + Moderation queue tab
                                    ▼
Status / page ▶ GET /reviews?scope=moderation ▶ flags table
                                    ▼
                         PATCH flag_id ▶ refresh page

Search / rating ▶ ordinary review rows
       (currently no connection to the moderation queue)
```

## Not in scope / existing decisions

- Backend pending-flag offset pagination can omit rows when other moderators
  resolve earlier flags. This is inherited from the base, not introduced by the
  UI. A cursor-based backend contract remains the stronger follow-up; no risk
  acceptance is implied here.
- Endpoint provisioning and database deployment were not inspected or changed.
  Earlier user instructions state the endpoint is deployed manually.
- Browser screenshots, mobile/tablet/desktop layout and actual dialog focus/
  Escape behavior were not validated. No responsive-readiness claim is made.
- Username allowlist plus active approver membership, Admin separation and host
  outage handling follow existing backend/routing policy, outside this UI diff.
- Search/filter implementation for moderation is not assumed to be a requirement;
  hiding irrelevant controls is the recommended smaller correction.

## Validation

The merged application tree was tested immediately before commit `76c5e2016`:

`CI=true npm test -- --watchAll=false --runInBand --silent src/features/review`

Result: 22 suites, 242 tests passed. This is the same application tree reviewed
here; no application changes occurred afterward. Tests were not repeated solely
to create this record. Passing suites do not cover the two reported defects.
Review record whitespace check passed. No live browser or deployment checks ran.

## Checklist decision

- Engineering review executed: yes. First PR checkbox remains unchecked until
  both findings are fixed or explicitly accepted/explained by the owner.
- Findings and proposed decisions recorded: yes. Second checkbox may be checked
  and linked to this file. No PR description was edited remotely.
