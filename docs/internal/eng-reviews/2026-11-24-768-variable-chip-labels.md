# Stay-date triggers, part 6: readable labels on the variable chips: engineering review

Branch: `feat/768-variable-chip-labels` (stacked on `feat/768-automations-style` until the earlier parts are merged)
Goal: the chips under the message template show a readable label instead of the raw tag, so a host who does not know the `{{name}}` syntax can still build a message. Display only: clicking a chip inserts exactly the same text as before, and no backend or saved data changes. This record has one section per commit.

## Commit 1: show readable labels on the template variable chips

Reviewed: the staged diff (`AutomationsPage.jsx`, `AutomationsPage.test.js`, `automations.scss`, this record)

### Decision

```
VARIABLES (single source)   { name, shortLabel, label }
                               │      │            │
  chip text  ◀─────────────────┼──────┘            │   "Check-in time"
  aria-label ◀── "Insert " + shortLabel.toLowerCase()   "Insert check-in time"
  title      ◀── label + " · {{" + name + "}}"      "Earliest check-in time · {{checkInTime}}"
  click      ◀── name ─▶ insertVariable(name) ─▶ template + "{{name}}"   (unchanged)
```

- `shortLabel` is added next to the existing `label`, so the list stays the one source for the nine variables.
- The chip text is the short label: Guest name, Property name, Check-in date, Check-out date, Check-in time, Check-out time, Address, City, Number of guests.
- The tooltip carries the longer description and the tag, so a host can still learn what is inserted.
- The screen reader label starts with "Insert" and contains the visible text.
- The chips no longer use a monospace face, which suited raw tags and not words.
- Options weighed: a separate label map in the test or component (rejected, a second list to keep in step), a field next to the existing label (chosen, at the host's request).
- Consequence accepted: the template field itself still shows raw tags in the message text.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` The accessible name differs from the visible text ("Insert guest name" and "Guest name"). It contains the visible text, so it meets the label-in-name rule. | 8/10 | Accepted. |
| `[P3]` The tooltip does not show on touch screens. The chip label and `aria-label` carry the meaning there. | 7/10 | Accepted. |
| `[P3]` `automations.scss`: the chip font is no longer monospace. A two-line change beyond the literal request. | 7/10 | Accepted. Reported to the host. |
| `[P3]` `VARIABLES` now holds `label` (description) and `shortLabel`. The names are slightly asymmetric. | 8/10 | Accepted. The existing field is kept. |

### Not in scope

- Showing readable names inside the template text.
- Translating the labels.
- Any backend, preview or saved-data change.

### What already exists

- `VARIABLES`, `insertVariable` and the chip styles, extended and not rebuilt.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| A chip inserts the wrong tag | A broken message | Yes (each of the five newer chips, plus the preview call) | `insertVariable(name)` is unchanged | The same tag as before |
| A label is added without a short label | Empty chip | Yes (order and text of all nine) | One list, all nine tested | A readable chip |
| Raw tag still visible on a chip | Host confusion | Yes ("shows no raw tag") | Chip text is the short label | Words, not tags |

### Verification

New and changed tests were red first (26 failing). Web hostmessages suites: 12 suites, 191 tests passed. Full web run: 299 suites and 4286 tests passed; the one failing suite is the unrelated website snapshot `panoramaElitePagesPin` from the earlier runs.
