# docs(property-owners): close the #3239 eng-review records and pass the owners API URL to the sites build

Pull request: (to be opened)
Issue: #3239
Reviewed commit: 963fbf709, plus the uncommitted workflow change on top of it
Result: no blocking findings

No application code changed.

The records: eight #3239 eng-review records still held "Pull request: (to be opened)" or "Reviewed commit: uncommitted changes on top of …". Each one now names its pull request and the feat or fix commits that hold the reviewed code. The numbers and hashes were traced from git:

1. `git log --follow` on the record found the docs commit that added it.
2. The first "Merge pull request #… from domits1/…" merge on acceptance that contains that docs commit gave the number.
3. `git log <merge>^1..<merge>^2` listed the commits the pull request brought in, and the feat or fix commits among them became the reviewed commit.

| Record | Pull request | Reviewed commit |
|---|---|---|
| 2026-10-30-3239-owner-api-client | #3744 | 276756b33 and e908ad2b3 |
| 2026-11-02-3239-owners-list-page | #3764 | 521bc3143, 6ec8d1cf3 and 18aa6e126 |
| 2026-11-03-3239-owner-form-modal | #3778 | 45534beed |
| 2026-11-03-3239-owner-form-rules | #3777 | e5cfc5f20 |
| 2026-11-09-3239-owner-detail | #3821 | e245135e5 |
| 2026-11-10-3239-owner-session-refresh | #3855 | 50021053e |
| 2026-11-10-3239-share-rules | #3849 | 5aee35924 |
| 2026-11-11-3239-set-shares-form | #3872 | 5e27084de and 095a3fab1 |

Each hash is on acceptance, and each number matches its merge commit.

The workflow: `.github/workflows/deploy-direct-booking-sites.yml` passes `REACT_APP_PROPERTY_OWNERS_API_URL` from `vars.*` to the sites build, next to the other API URLs. The variable is also in the build step's warning loop, so a missing variable shows a warning in the run. This follows `direct_booking_sites_hosting.md` line 87: one `REACT_APP_*` repository variable per value that the Amplify acceptance build sets. Amplify already sets this variable for every branch, with an override for acceptance. This closes the open point in the owner API client record (`2026-10-30-3239-owner-api-client.md:16`), which is left unchanged as history.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (9/10) | .github/workflows/deploy-direct-booking-sites.yml:62 | The workflow reads a repository variable that does not exist yet. Until it does, the build succeeds with a warning, and only the owners pages on the direct booking sites show the configuration error. Merging to acceptance starts a site deploy. | Accepted. A repository admin creates `REACT_APP_PROPERTY_OWNERS_API_URL` with the Amplify acceptance value, preferably before the merge. |
| P3 (8/10) | docs/internal/eng-reviews/2026-11-03-3239-owner-form-rules.md:5 | Pull request #3777 also holds e904d5aa7, a later test commit that moved the form rule cases into a JSON fixture. The record was written before that commit and does not mention it. | Accepted. The record describes what was reviewed, and only the reviewed commit was filled in. |
| P3 (7/10) | docs/internal/eng-reviews/2026-11-09-3239-owner-detail.md:5 | The reviewed commit names only the feat commit, while the record also covers the refactor commit 127716bdd. The same applies to 0261764e1 in the owner form rules record. | Accepted. Only feat and fix commits are named, and the refactors were committed separately. |
| P3 (6/10) | docs/internal/eng-reviews/2026-11-02-3239-owners-list-page.md:5 | The README template has one short hash on the reviewed commit line, while three records list several. | Accepted. Those pull requests have several feat commits, and naming one of them would be a guess. |

## Not in scope

- Creating the repository variable. That needs admin access on the repository.
- Other workflows. `ci.yml` and `webapp-build-test.yml` only test and build, and do not deploy.
