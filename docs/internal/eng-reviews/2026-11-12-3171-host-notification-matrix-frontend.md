# Engineering review: Host notification matrix UI (#3171)

Pull request: [#3859](https://github.com/domits1/Domits/pull/3859)
Backend dependency: [#3857 — merged](https://github.com/domits1/Domits/pull/3857)
Delivery dependency: [#3858 — open](https://github.com/domits1/Domits/issues/3858)
Scope: frontend matrix API client, state hook, form, localization, responsive styles and tests, compared with the backend contract merged through #3857.

## Decision

The frontend/backend contract is aligned. GET returns the canonical categories and the authenticated host's complete preference matrix. The current PUT implementation returns the saved flat matrix; the frontend now also accepts a wrapped `{ categories, preferences }` response and retains submitted values if a successful PUT returns no usable body.

**Release decision: hold.** Keep this PR in Draft until #3858 implements and verifies delivery enforcement and recipient identity mapping. The settings API persists preferences, but notification producers do not yet consistently consult them before delivery.

## Architecture and data flow

```
Host settings page
      |
      ▼
useHostNotificationEventPreferences
      |
      +---- GET host-events endpoint
      |          |
      |          ▼
      |     backend-owned catalogue + saved matrix (#3857)
      |
      +---- local edits and required-channel guard
      |
      +---- PUT complete matrix
                 |
                 ▼
            persisted preferences

Notification producers ──X──► saved preferences
                 #3858 delivery enforcement not complete
```

The frontend renders backend-owned event keys and required-channel metadata; it does not maintain a second event catalogue or required Email list. Guest preferences continue through the existing page and API.

## Findings and decisions

| Severity | Finding | Decision |
|---|---|---|
| P1 | Releasing the matrix before delivery producers consult saved preferences would expose controls that do not yet control delivery. | Hold in Draft; #3858 is an explicit release dependency. |
| P2 | A successful PUT can return a flat object, a wrapped object, or no usable body. Assuming a flat object can clear the matrix or show a false save error. | Accept only a complete matrix; otherwise preserve submitted values. |
| P2 | Form tests used display labels as channel object keys and assumed whitespace before category counts. | Use canonical channel keys and tolerant accessible-name matching. |
| P3 | Backend event labels are English; only the settings chrome is localized. | Disclose this in the UI and PR description; keep the catalogue backend-owned. |
| P3 | The 520px table and category tabs require horizontal overflow on narrow viewports. | Keep scroll containers and touch overscroll handling. Manual viewport verification remains required. |

## What already exists

- #3857 provides the canonical 87-event catalogue, required Email metadata, authenticated GET/PUT routes, defaults, legacy fallback and persistence.
- The form prevents editing required Email and bulk Email only targets optional events.
- The hook preserves unsaved changes when a save request fails; regression coverage now includes failed Host saves.
- Guest settings and their current API remain unchanged.

## Failure modes

| Path | Failure | Test coverage | Handling and user impact |
|---|---|---|---|
| GET | Request fails or returns an incomplete matrix. | Hook validates the complete matrix; existing loading/retry UI remains. | Editing stays blocked and a localized retry message is shown. |
| PUT | Request fails. | Host save-failure regression test. | Unsaved values remain in the form and can be retried. |
| PUT | Response is wrapped or empty despite success. | Wrapped-response and empty-body regression tests. | Submitted preferences remain visible and are treated as saved. |
| Delivery | A producer does not read the saved preference. | Tracked by #3858, outside this UI PR. | A notification may still be sent despite the displayed choice; this is why release is blocked. |
| Narrow viewport | Table or category tabs exceed the viewport. | CSS scroll containers; visual checks still required. | Horizontal scrolling remains available; screenshots/device verification are outstanding. |

## Not in scope

- Producer-level enforcement, recipient identity mapping and event-to-producer mapping: tracked in #3858.
- Translating backend event names: labels remain English and are disclosed; catalogue ownership stays in the backend.
- Guest notification settings or delivery behavior: Guest flow is unchanged.

## Verification

- Channel test helpers use `inApp`, `email` and `sms`; category-count selectors tolerate rendered accessible names.
- Tests cover wrapped and empty successful PUT responses and failed Host saves.
- CI must pass on the updated head before this PR can be considered ready.
- No mobile, tablet or desktop screenshots have been captured from a running rendered application in this review. Keep the visual checklist unchecked until verified.
