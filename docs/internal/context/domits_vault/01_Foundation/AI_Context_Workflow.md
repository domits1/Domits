---
type: runbook
status: active
area: ai-operations
owner: engineering
created: 2026-06-29
updated: 2026-06-29
confidence: high
source:
  - local: README.md
  - local: 01_Foundation/Domits_Context.md
  - local: 01_Foundation/Vault_Context_Architecture.md
related:
  - [[Domits_Context]]
  - [[Codex_Working_Agreement]]
  - [[Vault_Context_Architecture]]
  - [[Active_Feature_Tasks]]
---
# AI Context Workflow

- Last synced: 2026-06-29
- Scope: how Domits uses AI together with curated context, why the Obsidian vault exists, and what difference this workflow makes.

## Core Principle

- At Domits, AI is used as an engineering multiplier, not as a replacement for ownership or judgment.
- The goal is not to let AI "guess" the codebase from scratch every time.
- The goal is to give AI enough stable context that it can reason faster, stay aligned with product reality, and avoid repeating mistakes that the team already understands.

## Why We Use AI This Way

- Domits moves across many surfaces at once:
  - host tooling
  - guest flows
  - booking logic
  - direct booking websites
  - integrations
  - acceptance / release work
- A large part of engineering cost is not typing code.
- A large part of engineering cost is recovering context:
  - how the product works
  - what decisions were already made
  - what the team considers correct
  - which problems are still active
  - which trade-offs were already chosen

- AI helps most when context recovery is reduced.
- That is why we pair AI with a curated vault instead of relying only on raw chat memory.

## Why The Obsidian Vault Exists

- The vault is Domits' durable context layer for people and AI.
- It exists so important knowledge does not stay trapped in:
  - chat threads
  - one developer's head
  - scattered PR comments
  - one-off debugging sessions

- The vault is useful because it keeps stable knowledge close to the repo without mixing it into production code.
- It gives both humans and AI a reusable starting point for:
  - product understanding
  - engineering rules
  - active feature context
  - known risks
  - handoff continuity

## How We Use AI In Practice

### 1. Start Narrow, Not Blind

- New chats do not begin from a blank prompt alone.
- The normal startup path is:
  1. `README.md`
  2. `Domits_Context.md`
  3. the relevant working or feature note
  4. repo files

- This gives AI a stable orientation before it reads code.

### 2. Use The Vault For Durable Context

- The vault should contain:
  - durable product context
  - engineering rules
  - current task funnels
  - reusable decisions
  - confirmed bug patterns
  - deployment or workflow instructions

- The vault should not become:
  - a transcript archive
  - a dump of every conversation
  - a place for low-value brainstorming without outcomes

### 3. Use The Repo As Final Truth

- The vault helps AI orient itself.
- The repo is still the final source of truth for implementation reality.
- If the vault and the code disagree:
  - the repo wins
  - the vault should be corrected

### 4. Push Durable Learning Back Into Context

- AI is most useful when each meaningful task leaves behind better context for the next task.
- After real decisions or discoveries, the team should update the vault only where the information is durable enough to matter later.

## Why This Workflow Works Better

### Faster Onboarding

- New developers and new AI chats do not need to rediscover the same background repeatedly.
- The startup path becomes shorter and more repeatable.

### Better Continuity Across Sessions

- AI chats are temporary.
- Product and engineering context should not be temporary.
- The vault prevents important context from disappearing when a chat ends.

### Less Repetition

- The team avoids re-explaining:
  - the same feature history
  - the same architecture rules
  - the same deployment constraints
  - the same bug background

### Better Output Quality

- AI performs better when it understands:
  - naming
  - project structure
  - domain language
  - current task scope
  - known risks

- That leads to fewer wrong assumptions and fewer wasted iterations.

### Stronger Handoffs

- Work does not depend only on the current owner still being around.
- This matters for:
  - internships
  - handoffs
  - multi-branch work
  - paused features
  - later bug fixing

## What Difference It Makes At Domits

- It allows broad workstreams to stay manageable even when one engineer touches many areas.
- It helps the team handle overwhelming tasks by turning context into a repeatable funnel instead of re-opening the whole product every time.
- It reduces the bus factor by promoting important engineering and product knowledge into durable notes.
- It makes AI materially more useful than generic autocomplete or generic chat support, because the model is anchored in Domits-specific reality.

## Trade-Offs We Accept Deliberately

### Context Maintenance Costs Time

- Curating context takes time.
- We accept that cost because repeated re-discovery costs more over time.

### Not Everything Belongs In The Vault

- If everything is stored, retrieval quality gets worse.
- The vault must stay curated to stay useful.

### Stale Notes Are Dangerous

- A wrong vault note can mislead both humans and AI.
- That is why stable notes should be corrected when the repo reality changes.

### AI Still Needs Human Judgment

- AI can accelerate implementation, summarization, refactoring, and investigation.
- It should not replace technical accountability.

## Practical Rule Set

- Use AI to accelerate investigation, implementation, refactoring, summarization, and handoff work.
- Use the vault to provide stable context before asking AI to make repo decisions.
- Keep the vault focused on durable knowledge, not chat exhaust.
- Verify important claims against the repo.
- Update the vault after meaningful, reusable learning, not after every small conversation.

## Read Next

- Use [[Codex_Working_Agreement]] for coding and collaboration expectations.
- Use [[Vault_Context_Architecture]] for rules on what belongs in the vault and where.
- Use [[Active_Feature_Tasks]] when active implementation scope matters.
