# Stay-date triggers, part 5: automations page style: engineering review

Branch: `feat/768-automations-style` (stacked on `feat/768-stay-date-editor` until #4014 and part 4 are merged)
Goal: the automations page looks like the inbox (messages) instead of a different product, and the template variable chips show readable labels instead of raw tags. Commit 1 is styles only: no behaviour, markup or class name changes. Commit 2 changes the chips' text, tooltip and screen reader label; clicking a chip inserts the same text as before and no backend or saved data changes. This record has one section per commit.

## Commit 1: restyle the automations page like the inbox

Reviewed: the staged diff (`automations.scss`, this record)

### Decision

```
messagesV2.scss (.messages-v2)           automations.scss (.automations-page)
  --domits-green --surface --bg            same variables, defined on the page
  --border --text --muted                  (the page is not inside .messages-v2)
  card: 16px radius, 0 10px 30px .06       list card and editor card
  pill inputs, 11px 14px, green focus      input, select, time (textarea 16px, multi-line)
  icon button 12px radius, soft shadow     secondary button, refresh button
  green primary, hover lifts 1px           New automation, Activate
  title 28px/900, heading 18px/900         h1 and section headings
  chip 12px radius, 1px border             variable buttons
  sent bubble green tint                   schedule sentence
```

- The tokens are copied from `messagesV2.scss`: radius 16/14/12px and pills, the card, soft and focus shadows, page padding `18px 22px`, grid gap 16px, 13/14/15/18/28px type at weights 800 and 900.
- Every rule sits under `.automations-page`. The old rules for `.icon-button`, `.icon-text-button` and `.variable-buttons` were global; nothing else in `src` uses them.
- The `.host-messaging-shell` and `.host-messaging-tabs` rules in the same file are not touched, because that strip is shared with the inbox page.
- Responsive: the 900px collapse stays; a 600px step reduces padding and stacks the toolbar and actions. Grid columns use `minmax(0, 1fr)` so a long value cannot widen the editor. The delivery table scrolls inside its own wrapper.
- Options weighed for the New automation button: an icon-only round button (rejected, the tests and the host read its label), a green button with the plus icon and the label in the inbox style (chosen, at the host's request).
- Consequence accepted: the tab strip above the page keeps its old look until a change that touches both pages.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `automations.scss` (`.automation-editor select`): the chevron is a data-URI SVG with the `--muted` colour hardcoded. | 8/10 | Accepted. A CSS variable cannot be used in a data URI. |
| `[P3]` `.host-messaging-tabs` keeps the old look. | 8/10 | Accepted. Left out at the host's request. |
| `[P3]` The `.automations-page` prefix raises the specificity of every rule. | 7/10 | Accepted. It also ends the global leak. |
| `[P3]` No automated test covers styling. Overflow was measured on a static render of the editor at 375, 768, 1000 and 1280px, with none found. The visual check is done by the host in Chrome's device toolbar. | 7/10 | Accepted. |

### Not in scope

- The tab strip, the inbox styles and any markup or behaviour.
- A shared stylesheet for the tokens, which would touch the inbox.

### What already exists

- The inbox tokens and the existing automations class names, reused as they are.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Long automation name or booking id | Sideways scroll | Overflow measured at 4 widths | Ellipsis in the list, wrapping in the table, table scrolls in its wrapper | No page scroll |
| Narrow editor next to the list | Three-column row overflows | Measured at 1000px | `minmax(0, 1fr)` columns, one column from 900px | No overflow |
| Disabled controls | Look editable | Visual | Grey background, no shadow, not-allowed cursor | Clearly disabled |
| Keyboard focus | Focus not visible | Visual | Green border and shadow on inputs, outline on buttons | Visible focus |

### Verification

No behaviour change, so no red step. Web run: 299 suites and 4276 tests passed; the one failing suite is the unrelated website snapshot `panoramaElitePagesPin` from the earlier runs.

## Commit 2: show readable labels on the template variable chips

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
