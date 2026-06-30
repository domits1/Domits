---
type: concept
status: active
area: code-quality-rules
owner: engineering
updated: 2026-05-31
confidence: high
related:
  - [[Clean_Code_Standards]]
  - [[Domits_Engineering_Foundation]]
---
# Sonar Conventions

- Last synced: 2026-05-31T00:00:00+02:00 (W. Europe Standard Time)
- Scope: recurring code-quality patterns in Domits that are worth designing for up front, not fixing reactively after Sonar flags them.

## Position In The Funnel
- Read this after [[Clean_Code_Standards]].
- Use it as the bridge between broad coding standards and the more Domits-specific engineering context in [[Domits_Engineering_Foundation]].

## Purpose
- Treat repeated Sonar findings as signals of architectural or structural drift, not as isolated lint noise.
- The goal is not to satisfy Sonar mechanically. The goal is to write code that is easier to review, safer to extend, and less likely to create repeat churn.

## Maintenance Rule
- When a Sonar fix reveals a repeated structural pattern, add the generalized lesson here.
- Only record durable conventions that are likely to prevent future rework across files, features, or teams.
- Do not add one-off warnings, tool wording, or temporary cleanup notes.
- Treat this note as a living guide: refine recurring patterns after real fixes, not before.

## Recurring Conventions
- Prefer shared helpers when normalization, mapping, or formatting logic appears in more than one place.
- For website editor and template config, prefer small field, toggle, slot, and section builders over repeating similar object literals.
- Keep page-level files orchestration-only. Move section UI, reusable controls, dialog rendering, and targeting logic into focused modules.
- When multiple sections share the same behavior, create one shared section contract instead of cloning per-section implementations.
- Avoid nested ternaries and layered negated conditions in UI/config logic. Use named booleans or small helper functions when intent is not obvious.
- Be careful with prop spreading in React. Do not let shared interactive props accidentally override `className`, `style`, or accessibility attributes.
- Shared UI primitives must carry an explicit contract. Keep PropTypes or equivalent component contracts aligned with real usage.
- Keep runtime-specific checks consistent. For browser globals and APIs, follow the project pattern deliberately instead of mixing multiple access styles.
- If a UI state change only affects presentation, avoid coupling it to layout changes that shift content unexpectedly.

## Practical Review Prompt
- Before finalizing a change, ask:
  - Is this logic duplicated anywhere else?
  - Does this file own too many responsibilities?
  - Would a named helper or shared config make this clearer?
  - Could this prop spread or state merge override something unintentionally?
  - If Sonar saw this diff, would it flag structure, duplication, or readability?

## When To Abstract
- Abstract when the same concept exists in multiple sections, templates, or layers.
- Do not abstract purely to silence a one-off warning if the result is less clear than the original code.
- Prefer small, local abstractions with obvious names over generic utility dumping grounds.
