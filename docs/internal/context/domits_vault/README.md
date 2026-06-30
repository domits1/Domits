---
type: runbook
status: active
area: vault-entry
owner: engineering
created: 2026-06-03
updated: 2026-06-03
confidence: high
related:
  - [[01_Foundation/Domits_Context]]
  - [[01_Foundation/Codex_Working_Agreement]]
  - [[02_Codex_Context/Active_Feature_Tasks]]
  - [[01_Foundation/Vault_Context_Architecture]]
---
# Domits Vault

- Scope: universal first-read file for new developers and AI chats.

## Start Here

1. Read [[01_Foundation/Domits_Context]].
2. If the task involves coding, reviews, or repo work, read [[01_Foundation/Codex_Working_Agreement]] next.
3. If active implementation work matters, read [[02_Codex_Context/Active_Feature_Tasks]].
4. Open one relevant `<Feature_Name>_Current_Task.md`.
5. Load deeper foundation or feature notes only as needed.

## Fast Paths

- Product and platform context: [[01_Foundation/Domits_Business_Context]]
- Coding and review rules: [[01_Foundation/Codex_Working_Agreement]]
- Developer setup and workflow: [[01_Foundation/Domits_Developer_Onboarding]]
- Vault maintenance: [[01_Foundation/Vault_Context_Architecture]]

## Fresh Chat Prompt

Use a short startup prompt like:

```md
Inspect `README.md` and `01_Foundation/Domits_Context.md` first.

If the task is about coding or reviews, inspect `01_Foundation/Codex_Working_Agreement.md` next.

If active feature work matters, inspect `02_Codex_Context/Active_Feature_Tasks.md` and then only the one relevant `<Feature_Name>_Current_Task.md`.

Treat the vault as durable product and engineering context, not as a transcript archive.

Current task: <insert task here>
```

## Maintenance Rule

Keep this file short.

If the startup flow changes, update this file first.
