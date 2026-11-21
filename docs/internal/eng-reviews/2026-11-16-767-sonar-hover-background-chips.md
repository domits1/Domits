# Chip and popover hover background, Sonar css:S7924: engineering review

Branch: `feat/767-attach-chips`
Reviewed: the staged diff for the code commit (1 file, +2 -2), after merging `feat/767-attach-button-feedback`, which fixes the attach button block
Issue: SonarCloud rule `css:S7924` flags two more hover/focus blocks in `messagesV2.scss`. Both set `background: rgba(15, 23, 42, 0.08)` with `color: #0f172a`, and the rule ignores the alpha channel when it checks contrast.

## Decision

Replace the translucent background with the solid `#f1f5f9` in `.attachment-chip__remove` and `.preview-popover-close`, the same value used for the attach button in `2026-11-16-767-sonar-hover-background-feedback.md`. The text colour stays `#0f172a`.

- Options weighed: keep the rgba and suppress the Sonar finding (hides a check that is correct to ask for), or use a solid colour that the check can evaluate (chosen).
- Consequence accepted: the hover colour no longer adapts to the surface behind the button. `#f1f5f9` is slightly lighter than 8% of `#0f172a` on white, so the hover is a little softer than before.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `messagesV2.scss:691` and `:746` (`background: #f1f5f9;`): the chip remove button sits on the chip background, which may be close to `#f1f5f9`, so the hover could be hard to see. | 5/10 | Accepted; the focus ring and the colour change of the icon (`#64748b` to `#0f172a`) still show the state. Checked by the author in the browser is recommended before merge. |

## Not in scope

- The attach button block, fixed on `feat/767-attach-button-feedback`.
- The other `rgba` values in the file (`box-shadow`, `border`, the overlay `rgba(0, 0, 0, 0.55)`), which Sonar does not flag.

## What already exists

- `#f1f5f9` from the feedback branch fix.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Hover on a chip's remove button | Hover not visible against the chip | No (styling only) | Icon colour also changes | Darker icon, light circle |
| Hover on the popover close button | Same | No | Same | Same |

## Verification

`src/components/messages` and `src/features/hostdashboard/hostmessages`: 18 suites, 210 tests passed.
