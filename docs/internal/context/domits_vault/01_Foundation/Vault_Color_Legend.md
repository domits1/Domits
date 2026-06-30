---
type: runbook
status: active
area: vault-maintenance
owner: engineering
created: 2026-06-03
updated: 2026-06-22
confidence: high
source:
  - local: .obsidian/snippets/domits-vault-colors.css
  - local: .obsidian/graph.json
related:
  - [[Vault_Context_Architecture]]
  - [[Domits_Context]]
  - [[Active_Feature_Tasks]]
---
# Vault Color Legend

- Last synced: 2026-06-22
- Scope: explanation of the Domits vault color system used in the file explorer and graph view.

## Why This Exists

- The colors are navigation aids, not status markers.
- They help new developers and AI assistants recognize the main branches of the vault faster.
- Special startup notes can have their own highlight color even if they live inside a differently colored folder.

## Current Color Map

- Cyan: `README.md`
  - meaning: universal first-read file for new developers and new AI chats
- Red: `Domits_Context.md`
  - meaning: the main durable context hub after `README.md`
- Gold: `Active_Feature_Tasks.md`
  - meaning: active-work entry point when implementation context matters
- Blue: `01_Foundation/`
  - meaning: durable foundation knowledge, rules, onboarding, architecture, and vault maintenance
- Amber: `02_Codex_Context/`
  - meaning: active operational context, current-task notes, decisions, and session continuity
- Green: `03_Capabilities/`
  - meaning: durable feature-specific product and architecture notes
- Gray: `10_Repo_Snapshots/`
  - meaning: temporary supporting memory such as logs, changed files, and short-lived operational snapshots
- Pink: `99_Attachments/`
  - meaning: screenshots, imported assets, and supporting media

## Interpretation Rule

- Folder colors describe the type of note territory.
- Highlight colors on specific notes describe startup importance.
- Do not treat these colors as priority, urgency, or quality labels.

## Maintenance Rule

- If the vault palette changes, update:
  - `.obsidian/snippets/domits-vault-colors.css`
  - `.obsidian/graph.json`
  - this note
- Keep the file explorer and graph colors aligned unless there is a strong reason not to.
- Avoid adding too many unique colors; the system should stay easy to scan.
