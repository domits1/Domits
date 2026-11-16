# chore(distribution): remove the per-channel toggles placeholder card (#506)

Pull request: #3919
Issue: #506
Reviewed commit: `5fde1afa1`
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (6/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/views/HostChannelDistribution.test.js` | `expect(screen.getAllByText("Coming soon")).toHaveLength(2)` ties the test to the current number of placeholder cards, so a later PR that adds or removes a placeholder card has to update the count. | Accepted, because the count is what shows that each remaining card carries its own badge. No change needed now. |

## Architecture and data flow

Level: component. The Distribution view renders its placeholder cards from the `COMING_SOON_CARDS` constant in `HostChannelDistribution.js`. The change removes one entry. No component, prop, service call or dependency changes.

```text
COMING_SOON_CARDS
  ├── Room & rate mapping   ──▶ ComingSoonCard ("Coming soon")   (kept, belongs to PR 5/6)
  ├── Per-channel toggles   ──▶ removed
  └── Sync health           ──▶ ComingSoonCard ("Coming soon")   (kept, decision 6)
```

## What already exists

- `ComingSoonCard` already renders the "Coming soon" badge. The remaining two cards keep using it, so no component, style or badge CSS became unused.
- There was no toggle UI, mock data, service function, CSS or test to remove. The toggles were a placeholder card only. This was checked in the feature folder, the rest of `frontend`, `docs` and `backend` on `origin/acceptance` (`ce716e4fa`).

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| The Sync health card loses its "Coming soon" badge or disappears | New test "shows Sync health as a Coming soon card and offers no per-channel toggles" | The test fails. No new code path was added. |
| The toggles card comes back | Same test, `queryByText("Per-channel toggles")` | The test fails. |

The change adds no code path, so no production failure mode is new and there is no critical gap.

## Performance

No change.

## Not in scope

- The "Room & rate mapping" placeholder card. It belongs to PR 5 and PR 6, and decision 5 only covers the toggles.
- The connect and disconnect modals and `MOCK_CONNECT_FLOW_ENABLED`, which stay as they are (decision 4).
- Building the health card (decision 6). It stays "Coming soon".
- 9 failing tests in `listingDetails2.test.js`, which also fail on untouched `origin/acceptance` (`ce716e4fa`).
- Backend code. Per-channel toggles have no backend and none is planned, as confirmed by the backend owner.
