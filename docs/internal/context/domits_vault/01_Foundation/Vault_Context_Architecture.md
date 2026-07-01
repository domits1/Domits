---
type: runbook
status: active
area: vault-maintenance
owner: engineering
created: 2026-05-28
updated: 2026-06-22
confidence: high
source:
  - https://help.obsidian.md/manage-vaults
  - https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links
  - https://help.obsidian.md/properties
  - https://help.obsidian.md/data-storage
  - https://en.wikipedia.org/wiki/Zettelkasten
related:
  - [[Domits_Context]]
  - [[Codex_Working_Agreement]]
  - [[Vault_Color_Legend]]
---
# Vault Context Architecture

- Last synced: 2026-06-22
- Scope: how the Domits vault should be structured, maintained, and expanded without turning into noisy chat storage.


## Core Principle

- The vault is a curated memory system, not a transcript archive.

- Prefer updating existing notes over creating new notes.

- Create a new note only when the concept, decision, project, runbook, or glossary entry is genuinely distinct.



## Research Basis

This structure is intentionally aligned with a few broad practices from the Obsidian/linked-notes world:

- Obsidian vaults are plain-text note folders with internal links between notes, which makes a stable root note practical.

- Obsidian supports internal links and note networks directly, so notes should be connected deliberately instead of flattened into one document.

- Obsidian properties and metadata exist, but should support note purpose rather than replace clear structure.

- General linked-note / Zettelkasten-style practice favors smaller notes with explicit links and stable hubs rather than giant mixed-purpose notes.



## Domits Folder Mapping

We are not forcing a full folder rename to match a generic template. The current Domits vault is the source-of-truth structure and maps to the broader model like this:

- `01_Foundation/` acts as the stable equivalent of system rules, areas, and evergreen knowledge.

- `02_Codex_Context/` acts as the active-work and operational context layer.

- `03_Capabilities/` acts as feature-specific project and product context.

- `10_Repo_Snapshots/` acts as supporting operational memory, not as evergreen knowledge.



## Required Note Roles

Use a clear note role when maintaining durable notes. Preferred note types are:

- `project`

- `decision`

- `concept`

- `runbook`

- `issue`

- `meeting`

- `prompt`

- `source`

- `glossary`

- `archive`



Preferred status values are:

- `active`

- `draft`

- `needs-review`

- `stale`

- `deprecated`

- `archived`



Use frontmatter when the note is durable enough to matter later.



## Domits Root Structure
### Universal Entry File
- `README.md`
- Purpose: the one file new developers and AI chats should start with.
- It stays short and points readers into `Domits_Context.md` and the correct branch notes.

### Main Hub
- `Domits_Context.md`
- Purpose: the stable top-level context note for coworkers and AI onboarding after the root `README.md`.
- It should stay broad, durable, and low-churn.


### First-Level Branches
Examples:
- `Domits_Business_Context.md`
- `Codex_Working_Agreement.md`
- `Domits_Developer_Onboarding.md`
- `Active_Feature_Tasks.md`

- `Vault_Context_Architecture.md`



Purpose:
- broad navigation and onboarding
- stable branch entry points
- no deep implementation detail

### Second-Level Branch Hubs
Examples:
- `Local_Development_Setup.md`
- `Delivery_Workflow.md`

Purpose:
- keep a first-level branch note from turning into a giant mixed runbook
- route into a small set of narrower durable child notes
- absorb growth when one branch starts serving distinct subpaths such as setup versus delivery

## Visual System

- The vault uses a small fixed color system in the file explorer and graph view to make the main branches easier to scan.
- `Vault_Color_Legend.md` is the note that explains what the colors mean.
- The actual color config lives in `.obsidian/snippets/domits-vault-colors.css` and `.obsidian/graph.json`.


### Foundation Funnel Notes

Examples:

- `Clean_Code_Standards.md`

- `Sonar_Conventions.md`

- `Domits_Engineering_Foundation.md`

- `Project_Structure.md`

- `Database_Structure.md`



Purpose:

- durable cross-feature engineering context

- coding and review rules

- architecture and structure references



### Feature Task Branch Notes

Examples:

- `Direct_Booking_Website_Current_Task.md`

- future examples: `Review_System_Current_Task.md`, `Messaging_Current_Task.md`



Purpose:

- active, feature-specific task focus

- narrow current context for one workstream

- low-noise entry point for LLMs and coworkers working on one feature



Naming rule:

- use `<Feature_Name>_Current_Task.md`

- each note should describe one active feature workstream, not all company work at once



### Feature Notes

Examples:

- `Direct_Booking_Website.md`



Purpose:

- durable feature contracts

- architecture decisions

- terminology

- repo doc index for one product area



### Log / Snapshot Notes

Examples:

- `Session_Summary.md`

- `Decisions_Log.md`

- `Changed_Files.md`



Purpose:

- short-term continuity

- reverse-chronological support context

- never the main navigation path



## Intake Filter

Preserve information only if it is one of the following:

1. A decision that affects future work.

2. A reusable engineering rule.

3. A project status change.

4. A confirmed architecture detail.

5. A known problem or risk.

6. A migration, deployment, or smoke-test instruction.

7. A reusable prompt.

8. A research insight.

9. A lesson learned from a mistake.

10. A definition that improves shared understanding.



Do not preserve:

- repeated explanations already captured elsewhere

- temporary brainstorming unless it became a decision

- random links without explanation

- low-value chat filler

- one-time commands unless they belong in a runbook

- duplicate content

- speculation presented as fact



## When To Use Which Note
### `README.md`
Use when:
- a new developer opens the vault for the first time
- a new AI chat needs one explicit first file
- you want a short startup prompt and a narrow reading order

Do not use it for:
- durable implementation detail
- active task status
- deep architecture explanations

### `Domits_Context.md`
Use when:
- onboarding a new coworker
- bootstrapping a new AI chat
- deciding what branch should be read first after `README.md`


Do not use it for:

- detailed task status

- file-by-file change logs

- temporary implementation notes



### First-Level Branch Notes
Use when:
- the note is a broad branch entry point
- a new coworker or LLM should reach it early
- the topic routes into deeper context rather than owning all detail itself

### Second-Level Branch Hubs
Use when:
- a first-level branch now routes 3 or more durable child notes
- one branch serves distinct subpaths with different readers or tasks
- keeping everything in one note would make scanning and maintenance worse


### `Active_Feature_Tasks.md`

Use when:

- you need the active-work branch of the brain

- multiple feature-specific task notes may exist at once

- a new chat should select one relevant task note instead of reading all active work



Update when:

- a feature workstream starts or ends

- a task note becomes active, stale, or archived



### Feature-Specific Current-Task Notes

Use when:

- one feature workstream is active right now

- a new chat needs narrow current focus for one area

- current scope, changed files, risks, and next decisions are specific to that feature



Update when:

- the active scope materially changes

- the important files or decisions shift

- the task stops being the active task for that feature



Do not make these notes the root of the vault.



### Log / Snapshot Notes

Use when:

- you want chronological continuity

- the current or most recent file surface matters temporarily



Keep them:

- concise

- tied to the relevant feature-specific current-task note

- out of the main navigation path



### Feature Notes

Use when:

- a feature has durable product or architecture contracts

- the repo docs for that feature need a quick vault entry point



Do not update for every tiny UI tweak.



## Update Workflow

For every meaningful new input:

1. Extract durable knowledge.

2. Update the most likely existing note first.

3. Create a new note only if the concept is genuinely distinct.

4. Add or update frontmatter when the note is durable enough to matter later.

5. Add meaningful links only where they help retrieval.

6. Remove duplication.

7. Mark stale or conflicting notes clearly instead of silently overwriting them.



## How To Update The Vault

- Start by asking which existing note already owns the information.

- If the information is a durable project update, update the project or feature note.

- If the information is a repeated engineering lesson, update a rule or standards note.

- If the information is transient or unclear, do not promote it directly into a permanent source-of-truth note.

- If a helper note would only restate what this runbook already says, do not create it.



## When To Update The Vault

- Update the vault after real decisions, durable architecture changes, reusable prompts, stable bug patterns, workflow changes, research insights, and source-of-truth shifts.

- Do not update the vault for low-value chat filler, temporary brainstorming, or one-off command history.

- If the information will not help a future developer or agent make a better decision, leave it out.



## Funnel Linking Rules

### Root Link Depth
- `README.md` may link to `Domits_Context.md` and a very small number of first-step branch notes when that improves startup clarity.
- `Domits_Context.md` may link only to first-level branch notes.
- First-level branch notes may link to their immediate deeper notes.
- Specialized notes should not link directly to `Domits_Context.md` unless they are intentionally first-level branch notes.


### Coding / Development Funnel

- Keep the coding path as:

  - `Codex_Working_Agreement.md`

  - `Clean_Code_Standards.md`

  - `Sonar_Conventions.md`

  - `Domits_Engineering_Foundation.md`

  - `Project_Structure.md` / `Database_Structure.md`

- If a new coding/development note is added, place it at the narrowest correct level instead of linking it straight to the root.



### Feature / Active Work Funnel

- Keep the active-work path as:

  - `Active_Feature_Tasks.md`

  - one relevant `<Feature_Name>_Current_Task.md`

  - the matching feature note

  - supporting source, log, or snapshot notes only if needed

- Feature notes should not link directly to `Domits_Context.md` by default.

- Log and snapshot notes should point to the relevant feature-specific current-task note, not to the root hub.



### Good Linking

- Use links for dependencies, decisions, source-of-truth notes, follow-up risks, and runbooks.

- Prefer one strong upstream link over many weak sibling links.

- Keep branch notes as funnels, not mini-hubs.



### Avoid

- `everything links to everything`

- repeated giant `Related Notes` blocks across all notes

- making volatile notes the center of the graph

- turning logs into navigation hubs

- linking generic words that are not real source-of-truth notes



## Practical AI Onboarding Flow
For a new AI chat, the default reading order should be:
1. `README.md`
2. `Domits_Context.md`
3. the relevant first-level branch note
4. if active work matters, `Active_Feature_Tasks.md`
5. one relevant feature-specific current-task note
6. relevant foundation or feature notes
7. session and log notes only if chronology matters


## Maintenance Rhythm

Daily:

- process new durable context into the right existing note

- delete obvious junk

- mark unclear material as `needs-review` instead of treating it as fact



Weekly:

- review active project and feature notes

- merge duplicate notes

- update stale decisions or assumptions

- promote repeated lessons into standards or runbooks



Monthly:

- archive completed or outdated material

- review source-of-truth notes

- confirm the vault still reflects current repo and product reality



## Maintenance Rule

- Add new root or first-level branch notes only when the topic is broad and reused often.

- Add new feature-specific current-task notes when a real active workstream exists for that feature.

- Add new feature notes when a product area gains durable contracts.

- Trim links when notes become graph hubs without adding real navigation value.

- If a note changes frequently, it is probably not a good root note.

- If a lesson repeats across multiple fixes or chats, promote it into a durable rule note instead of leaving it buried in summaries.



## Source References

- Obsidian Help - Manage vaults: https://help.obsidian.md/manage-vaults

- Obsidian Help - Internal links: https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links

- Obsidian Help - Properties: https://help.obsidian.md/properties

- Obsidian Help - How Obsidian stores data: https://help.obsidian.md/data-storage

- Wikipedia - Zettelkasten: https://en.wikipedia.org/wiki/Zettelkasten
