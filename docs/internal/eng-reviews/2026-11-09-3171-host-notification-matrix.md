# Host Notification Matrix — #3171

Review basis: focused implementation review of the branch changes and existing communication-preferences flow. The repository eng-review skill was not run as a formal review.

## What already exists

- The Host Dashboard already exposes `/settings/communication-preferences`.
- The existing Host/Guest preference API stores a fixed three-event matrix (reservation, cancellation and messages) with Email, SMS and Push channels.
- That API validates a fixed payload shape; extending only the existing React form would not persist the additional #3171 event categories.
- Finance notification sending currently resolves recipients from the static finance matrix; it does not read user event preferences.

## Decisions

1. Keep the existing Host/Guest channel-preference contract unchanged.
2. Add a separate Host matrix scope to the authenticated communication-preferences endpoint.
3. Persist Host event toggles in a dedicated user-scoped table, rather than overloading the existing three-event columns.
4. Enforce Engineering access in the backend based on Admin/Engineer claims; frontend hiding is not the security boundary.
5. Keep Guest journey preferences out of Host Dashboard settings. Include Staff & Tasks because #3510 explicitly requests a Tasks tab in Communication Preferences.

## Data flow

```text
Host Dashboard settings
        |
        v
GET/PUT /user/communication-preferences?persona=host&scope=matrix
        |
        v
Cognito claims + matrix validation
        |
        v
Host notification preference service
        |
        v
host_notification_preferences
```

## Not in scope

- Guest-specific journey notifications from #3525; they belong in Guest Dashboard settings.
- Delivery-provider or recipient-rule changes.
- Wiring every existing notification producer to consult the new matrix.
- Quiet hours, digests, channel-by-channel delivery choices and property-level policy inheritance.

## Failure modes and handling

- Preference API unavailable: the UI shows a load/save error and does not allow toggles or saving before a successful load.
- Invalid or unknown event key: the backend rejects the payload with a 400 response.
- Non-Admin/Engineer attempts to write Engineering preferences: backend rejects with 403; regular Host saves preserve stored Engineering values.
- Matrix table migration not yet applied: persistence will fail until the database migration is applied through the approved process; this prerequisite is documented and must be completed before enabling the endpoint.

## Important delivery limitation

The new UI and API persist event preferences. Existing notification dispatchers do not yet consult this preference record, so toggling an event does not by itself guarantee that an outgoing notification is suppressed. Delivery integration needs its own end-to-end implementation and tests before these preferences can be treated as effective delivery controls.
