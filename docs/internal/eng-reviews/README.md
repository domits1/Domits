# Eng-reviews

Every pull request gets an eng-review before it is opened. This folder keeps the result: what the review found and what we did with each finding. It shows that the review ran, and it explains later why something was fixed or left as it is.

## When

Add the file in the same pull request, before asking for reviews, and link it in the eng-review checkbox of the pull request description. Run the review again if the code changes a lot after that, and update the file.

## Name

`YYYY-MM-DD-<issue>-<short-name>.md`, for example `2026-10-28-3567-full-sync-error-texts.md`.

## Template

```markdown
# <pull request title>

Pull request: #<number>
Issue: #<number>
Reviewed commit: <short hash>
Result: no blocking findings / <n> blocking, all fixed

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | file.js:42 | What is wrong | Fixed in <commit> / Accepted, because ... |

## Not in scope

- What we left out on purpose, with the follow-up issue if there is one.
```

Write "No findings." under Findings when there were none. Severity and confidence come from the eng-review skill: P1 is the most severe, the number is how sure the review is.
