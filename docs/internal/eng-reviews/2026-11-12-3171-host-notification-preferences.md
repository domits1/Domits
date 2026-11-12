# feat(notifications): persist host notification preferences (#3171)

Pull request: #3857
Issue: #3171
Reviewed commit: 14572a48
Result: 2 findings, both fixed

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | `backend/functions/communication-preferences/business/service/service.js:202-217` | The first save performed a read followed by an insert without retrying Aurora DSQL serialization conflicts. Two concurrent first saves could both read no row; one transaction could then fail with `40001`/ `OC001` and return an API error. | Fixed in `253ad83`: retry the complete read/write operation with the existing shared `withDsqlRetry` helper. Added a regression test in `14572a4` that simulates a competing first insert and verifies the retry rereads the row and preserves its original `created_at`. |
| P2 (10/10) | `backend/ORM/migrations/20261109_host_notification_preferences.js:2-26` | The ORM migration only created and dropped `main.host_notification_preferences`, while the accompanying SQL migration and runbook provisioned both `test` and `main`. Running the JavaScript migration alone would leave the schemas inconsistent. | Fixed in `376e746`: the ORM migration now creates both schemas in the same order as the SQL migration and drops them in reverse order. |

## Architecture and data flow

The backend remains the owner of the canonical 87-event catalog and the persisted preference shape. The controller derives the user identity from Cognito claims; the service validates and normalizes the matrix; the repository persists one JSON matrix per Cognito user.

```text
Host settings UI (#3859, held as Draft)
        │ GET / PUT (persona=host, view=host-events)
        ▼
CommunicationPreferencesController
        │ Cognito claims.sub
        ▼
CommunicationPreferencesService
        ├── GET: saved matrix → normalize
        │        no saved row → legacy Host preferences → defaults
        │
        └── PUT: validate → DSQL retry (read + write)
                         ▼
             host_notification_preferences
                         │
                         └── one row per Cognito user

Notification producers ── delivery enforcement deferred to #3858
```

The new repository and TypeORM entity are reused for persistence. Existing `communication_preferences` reads remain a compatibility fallback only when no event-matrix row exists. Guest preferences and the legacy Host channel-preferences endpoint remain outside this change.

## What already exists

- The shared `withDsqlRetry` helper handles Aurora DSQL conflict codes `40001` and `OC001`; the save path now reuses it rather than adding another retry implementation.
- The backend catalog supplies seven categories, 87 events and required-channel metadata; the frontend does not duplicate the event-key list.
- Legacy Host values are mapped to event preferences on first read; missing legacy values use documented defaults.
- The runbook requires the `test` schema to be applied and verified before `main`, and the table is not created by Lambda at runtime.

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| Two hosts' browser requests (or duplicate requests for one host) race on the first insert | The new regression test simulates a DSQL `40001` conflict and checks that the retry rereads the winning row. Exhausting all retry attempts is not separately tested. | The full read/write operation retries up to the shared helper's configured limit. If conflicts continue, the error is returned; the UI's save-error state keeps unsaved changes available for retry. |
| No event-matrix row exists for a host | Existing tests cover both legacy-value mapping and defaults when no legacy row exists. | The service returns mapped legacy values or defaults; it does not require a pre-populated matrix row. |
| One of the schemas is not migrated before the endpoint is enabled | Covered by the SQL runbook's operator verification, not an automated unit test. | Database operations fail rather than silently storing in a different schema. The deployment runbook requires both schemas to be checked before enabling the endpoint. |
| A stored preference JSON value is malformed | No dedicated malformed-JSON test is present. | The service throws an error rather than silently replacing corrupted saved preferences with defaults; the frontend displays its load-error state. |

## Performance

The event matrix is stored as one row per user, so reads and writes do not issue one query per event. A host without a new row incurs one additional legacy-preference lookup; after the first save, the matrix read uses the new table only. No N+1 access pattern was found.

## Not in scope

- Notification producer mapping, recipient identity resolution and per-channel delivery enforcement remain tracked in #3858. They are deliberately not implemented as a global delivery check because the catalog spans separate producers and recipient types.
- The frontend settings matrix in #3859 is held as Draft and must not be merged or released to hosts until #3858 is complete and verified.
- Guest notification preferences, the existing Host channel-preferences endpoint and the required reservation/cancellation Email policy are unchanged.
