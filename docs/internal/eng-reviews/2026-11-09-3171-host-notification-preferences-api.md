# feat(notifications): persist host notification preferences (#3171)

Pull request: #3811
Issue: #3171
Review basis: backend/API integration and simplified Host Dashboard notification settings
Result: adds authenticated host-scoped persistence for per-event In-app, Email and SMS choices. Delivery enforcement remains a separate integration task.

## Scope

- Add the host notification preference table, ORM entity and repository.
- Extend the existing Communication Preferences endpoint with a host-only event-matrix view.
- Store three independently selectable channels for each of the 87 host notification events.
- Default new preferences to In-app and Email enabled, SMS disabled.
- Keep the existing Guest channel preference endpoint unchanged.
- Validate the complete event-key and channel allowlists on the backend.

## Findings and decisions

| Severity | Area | Finding | Decision |
|---|---|---|---|
| P1 | Delivery | Preference persistence does not yet suppress notifications. | Documented; notification producers/workers must enforce the selected channels in a separate follow-up. |
| P2 | Database | The new table requires a database migration. | Added migration; it must be applied through the approved process and is not run at Lambda startup. |
| P2 | Authorization | Preferences must belong to the authenticated host, not a caller-supplied user ID. | Use Cognito `claims.sub`; only the HOST persona may use the event-matrix view. |
| P2 | Validation | Incomplete, non-boolean or unknown channel preferences must not be saved. | Validate all 87 events and the three supported channel keys. |
| P2 | Compatibility | Existing rows store a single event-level boolean. | Normalize legacy true values to the new default channels and false values to all channels disabled. |

## Validation

- Added service and controller tests for defaults, persistence, validation, timestamps, legacy values and host-only access.
- Added API tests for authenticated GET/PUT requests.
- Added page tests for independent per-event channel selection and Guest preference behavior.
- Tests were not run locally; CI must validate the changes.
