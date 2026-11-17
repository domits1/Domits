# docs: require a decision with a reason for every eng-review finding in the PR template

Pull request: not opened yet
Issue: none (requested in Discord after #3939)
Reviewed commit: working tree on 766766ae9
Result: 1 finding, accepted (non-blocking)

## The change

The eng-review section of `PULL_REQUEST_TEMPLATE.md` had one checkbox for "findings and decisions", so nothing made sure each finding actually got a decision, or that the reason was written down. The section now:

- splits running the skill and adding the review file into separate checkboxes;
- adds a checkbox that every finding has a decision: fixed (with commit), accepted (with reason) or follow-up (with issue number);
- adds a `### Decisions` table (Finding, Decision, Why) in the PR description, so reviewers see the decisions without opening the review file. "No findings." is allowed when there were none.

The rest of the template is unchanged.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `PULL_REQUEST_TEMPLATE.md:8-11` | The decisions now live in two places: the `Decision` column of the review file and the `### Decisions` table in the PR description. The two can drift apart when a decision changes after the PR is opened. | Accepted. The review file stays the record, the PR table is the summary for the reviewer at review time. The README already says to update the review file when the code changes a lot, which covers the drift. |

## Not in scope

- Changing the review file format in `docs/internal/eng-reviews/README.md`. Its `Decision` column already asks for "Fixed in <commit> / Accepted, because ...", which matches the new checkbox.
- Enforcing the checkboxes with a CI check. The template stays a checklist for the author and the reviewer.
- Updating pull requests that are already open.

## Verification

- `git diff` touches only the first three lines of `PULL_REQUEST_TEMPLATE.md`, replaced by the new section. All other sections are byte-for-byte unchanged.
- The `[//]: # (...)` comment uses the same syntax as the existing comments in the template, so it does not render in the PR description.
