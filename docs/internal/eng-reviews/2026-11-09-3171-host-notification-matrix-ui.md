# feat(notifications): add host notification preferences UI (#3171)

Pull request: #3810
Issue: #3171
Review basis: host notification UI and API changes against `acceptance`
Result: the backend now owns one canonical event catalog; the Host Dashboard renders the categories and event names returned by the authenticated GET endpoint.

## Scope

- Add seven host-facing notification categories and 87 event options.
- Show only the notification name and three delivery choices: In-app, Email and SMS.
- Add a quick action to turn off or re-enable email for all events.
- Remove internal metadata such as actions, priority and recipients from the user-facing screen and UI catalog.
- Add English, Dutch, German and Spanish interface labels.
- Keep the notification event identifiers in one backend catalog and return that catalog with the saved host preferences.

## Findings and decisions

| Severity | Area | Finding | Decision |
|---|---|---|---|
| P1 | Catalog consistency | Maintaining separate frontend and backend event lists creates drift risk and duplicated code. | Backend catalog is the single source of event keys, categories and display names; the frontend uses the GET response. |
| P2 | Accessibility | Channel checkboxes have event-and-channel-specific accessible labels; category navigation uses keyboard-operable buttons. | Keep native checkbox controls and accessible labels. |
| P2 | Responsiveness | The four-column notification table is horizontally scrollable on narrow screens. | Keep event names readable and allow the three channel columns to scroll when required. |

## Validation

- Backend service tests verify all 87 event keys, preference defaults and strict validation.
- Frontend component tests cover category navigation, all three channels, bulk email opt-out and load-error behavior.
- Frontend integration tests verify loading the catalog and saving channel selections.
- CI must validate the changes; local tests have not been run.
