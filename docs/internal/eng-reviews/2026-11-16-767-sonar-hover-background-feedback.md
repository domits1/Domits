# Attach button hover background, Sonar css:S7924: engineering review

Branch: `feat/767-attach-button-feedback`
Reviewed: the staged diff for the code commit (1 file, +1 -1)
Issue: SonarCloud rule `css:S7924` flags the attach button hover/focus block in `messagesV2.scss`. The block sets `background: rgba(15, 23, 42, 0.06)` with `color: #0f172a`, and the rule ignores the alpha channel when it checks contrast.

## Decision

Replace the translucent background with the solid `#f1f5f9`, which is what `rgba(15, 23, 42, 0.06)` renders as on a white surface. The text colour stays `#0f172a`.

- Options weighed: keep the rgba and suppress the Sonar finding (hides a check that is correct to ask for), or use a solid colour that the check can evaluate (chosen).
- Consequence accepted: the hover colour no longer adapts to the surface behind the button. The composer row is white, so the rendered colour is the same.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `messagesV2.scss:639` (`background: #f1f5f9;`): on a non-white surface the hover tint would differ from the old translucent one. | 6/10 | Accepted. The attach button only sits on the white composer row. |

## Not in scope

- The same pattern in the chips and popover rules. Those are in `feat/767-attach-chips` and are fixed there after this branch is merged into it.

## What already exists

- `#f1f5f9` is a slate-100 tone from the same palette as `#0f172a` and `#64748b` already used in this file.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Hover or keyboard focus on the paperclip | Text unreadable on the background | No (styling only) | `#0f172a` on `#f1f5f9` is a high contrast pair | Light grey circle behind the icon |
| Disabled paperclip | Hover colour applied | No | `:hover:not(:disabled)` unchanged | No change |

## Verification

`src/components/messages` and `src/features/hostdashboard/hostmessages`: 18 suites, 197 tests passed.
