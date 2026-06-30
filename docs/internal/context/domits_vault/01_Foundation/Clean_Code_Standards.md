---
type: concept
status: active
area: engineering-standards
owner: engineering
updated: 2026-06-04
confidence: high
related:
  - [[Codex_Working_Agreement]]
  - [[Sonar_Conventions]]
---
# Clean Code Standards

- Last synced: 2026-06-04T00:00:00+02:00 (W. Europe Standard Time)
- Scope: Domits coding expectations for implementation, refactor, and review work.

## Position In The Funnel
- For implementation work, this is the first standards note to read after [[Codex_Working_Agreement]].
- Then read [[Sonar_Conventions]] for the recurring structural patterns we keep tripping over in this codebase.

## Source Docs In Repo
- `docs/internal/standards/clean_code_reference_guide.md`
- `docs/internal/standards/code_conventions.md`
- `docs/internal/infra/workflows/devops.md`
- `sonar-project.properties`

## Non-Negotiables
- Code must be professional, readable, maintainable, and intentionally named.
- Prefer simple explicit solutions over clever hacks or magical abstractions.
- Avoid dead code, commented-out logic, temporary shortcuts, and premature abstraction.
- If the code would be embarrassing in a senior PR review, it is not acceptable.

## Naming / Structure Rules
- Folders: lowercase.
- JS/React component files: PascalCase where that convention applies in Domits docs.
- HTML/CSS class/file names: kebab-case.
- Methods/variables: camelCase.
- Constants: `UPPERCASE_WITH_UNDERSCORES`.

## Function / Module Discipline
- Functions should do one thing and stay small enough to reason about quickly.
- Avoid flag parameters when separate functions would be clearer.
- Keep responsibilities separated instead of collapsing parsing, validation, persistence, and UI behavior into one blob.
- Prefer high cohesion over giant utility dumping grounds.

## Dynamic Over Static
- Prefer dynamic code and layout behavior over static hardcoded values when the behavior should adapt to real data, viewport size, or runtime conditions.
- Avoid magic numbers for responsive sizing and spacing when the same result can be expressed through relationships such as `clamp(...)`, container size, content size, shared tokens, or existing layout variables.
- Use hardcoded fallback values only when they are intentional constraints, and name or document them clearly enough that a future reviewer understands why they exist.
- Practical rule: if a UI element should scale across screen sizes, make it scale from responsive rules instead of copy-pasting separate fixed values until it looks right on one device.

## Comments / Formatting
- Comment why, not what.
- Good code should explain itself through naming and structure.
- Keep formatting consistent and keep related code together.

## Error Handling / Testing
- Handle failure paths intentionally instead of swallowing errors or returning vague junk.
- Tests should be readable, reliable, and scoped to one behavior/concept at a time.
- On backend work, validate inputs and data consistency before persistence side effects.

## Sonar / PR Hygiene
- SonarCloud is not the only source of truth, but repeated Sonar findings are usually early warnings for maintainability debt and review churn.
- Even if SonarCloud is not treated as the most critical CI gate in Domits docs, you should still treat recurring findings as bugs in code quality, not as optional polish.
- Practical rule: before opening a PR, scan your diff like a Sonar reviewer would. If a function is doing too much, if the same logic appears twice, or if the component contract is unclear, fix it before the bot or reviewer points it out.
- Do not cargo-cult Sonar fixes. If a finding conflicts with a clearer design, choose the clearer design and be ready to justify it.

## Review Heuristics
- Watch for duplicated code, long methods, unclear names, too many parameters, and mixed responsibilities.
- Treat brittle or unclear implementations as defects, not style preferences.
- Leave the code cleaner than you found it.
