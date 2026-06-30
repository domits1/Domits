---
type: concept
status: active
area: vault-onboarding
owner: engineering
created: 2026-05-28
updated: 2026-06-03
confidence: high
related:
  - [[Codex_Working_Agreement]]
  - [[AI_Context_Workflow]]
  - [[Domits_Business_Context]]
  - [[Domits_Developer_Onboarding]]
  - [[Active_Feature_Tasks]]
  - [[Vault_Context_Architecture]]
---
# Domits Context

- Last synced: 2026-06-03
- Scope: stable starting context for Domits developers and AI assistants; read this immediately after the root `README.md`.

## Core Principle

- This vault is a curated memory system, not a transcript archive.
- `README.md` is the universal first-read dispatcher.
- This note is the stable main hub that the root `README.md` points into.
- Use `Active_Feature_Tasks.md` as the active-work branch, not as the root of the vault.

## How To Use This Note

- After `README.md`, read this note before `Active_Feature_Tasks.md`.
- If you enter the vault from the folder tree instead of the root `README.md`, read this note first.
- If the task is about maintaining the vault itself, read [[Vault_Context_Architecture]] immediately after this note.
- If a live request differs from the current feature-task note, use that task note only as supporting context.

## Main Branches

### Product / Platform Context

- [[Domits_Business_Context]]

### Working / Coding Rules

- [[Codex_Working_Agreement]]
- [[AI_Context_Workflow]]

### Developer Onboarding

- [[Domits_Developer_Onboarding]]

### Active Work

- [[Active_Feature_Tasks]]

### Vault Structure

- [[Vault_Context_Architecture]]

## Funnel Shape

- Product / platform path: start at `Domits_Business_Context`, then move into terminology and core modules.
- Coding / development path: start at `Codex_Working_Agreement`, then move into clean code standards, Sonar conventions, engineering foundation, project structure, and database structure as needed.
- Active feature path: start at `Active_Feature_Tasks`, then move into the relevant feature-specific current-task note and only then into the feature note and source/log notes.

## Usage Rule

- Keep this note stable and broad.
- Put temporary task direction in feature-specific current-task notes under `Active_Feature_Tasks.md`.
- Put durable feature behavior in feature notes.
- Put durable coding and AI workflow rules in the coding/development funnel notes.
- If repo code and vault context disagree, the repo wins and the vault should be corrected.
