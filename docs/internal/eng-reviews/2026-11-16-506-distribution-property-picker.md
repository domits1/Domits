# feat(distribution): load the property picker from real data (#506)

Pull request: #TBD
Issue: #506
Reviewed commit: `752bccc95`
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/services/channexDistributionService.js:196` | `.map((mapping) => mapping?.domitsPropertyId)` let `undefined` into the set of linked ids. A mapping without an id made `size` 1, so `hostDashboard/all` was called when nothing was linked, and a listing without an id would have matched. | Fixed before the commit: the ids are filtered with `.filter(Boolean)`. The test "ignores mappings without a property id" failed first and now passes. |
| P3 (8/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/views/HostChannelDistribution.js:65` and `:40` | `showLastSync` is still reachable with `MOCK_PREVIEW_SECTIONS_ENABLED = true`, but `useChannexDistribution()` (line 40) no longer receives a property, so sync evidence is never fetched. With the flag on, the card could say "No sync yet" about something that was never queried, which the comment on line 64 warns against. | Accepted, because the flag is `false` and only for local preview, and the evidence fetch moves into its own hook in the next PR (Last sync card on real data). The picker needs the status first, and the status comes from the same hook that used to need the picked property. |
| P4 (5/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/hooks/useMappedProperties.js:56` | When `enabled` goes false and then true again, the first render after re-enabling returns the previous result for one frame, before the effect sets the loading state. | Accepted, because it needs a disconnect followed by a reconnect and the stale frame is not visible in practice. |

## Architecture and data flow

Level: component. The view talks to a hook, the hook to the service, and the service to two read-only endpoints. The picker waits for the Channex status, so a host without a connection triggers no property request.

```text
HostChannelDistribution
  │ useChannexDistribution() ──▶ GET /integrations/channex/status
  │        status = connected or needs attention?
  ▼
useMappedProperties({ enabled })
  ▼
getMappedProperties()
  ├─ GET /integrations/channex/linked-room-types ── 409 ─▶ UNAVAILABLE (no picker, no sentence)
  │        no mappings ───────────────────────────────────▶ []  (hostDashboard/all not called)
  ├─ no access token ─────────────────────────────────────▶ error
  └─ GET /property/hostDashboard/all ── 404 ─▶ []   other failure ─▶ error
           ▼
   listings whose property.id has a linked room type ──▶ picker options
```

The 409 states that the picker treats as "unavailable" are `CHANNEX_NOT_CONNECTED` and `CHANNEX_RECONNECT_REQUIRED`, both from `resolveUsableChannexIntegration`. The Last sync card and the Property mapping table stay hidden behind `MOCK_PREVIEW_SECTIONS_ENABLED`.

## What already exists

- `requestChannex` in `hostintegrations/channexApi.js` already sends the ID token and attaches the HTTP status to the error. `getLinkedChannexRoomTypes` reuses it. The backend overwrites `userId` with the token's `sub`, so none is sent.
- `fetchListingsFromHostDashboard` in `services/hostPropertyService.js` already calls `hostDashboard/all` and reports the HTTP status without throwing. It is reused, together with the 404-as-empty convention from `complianceApi`.
- The picker option shape and the "default to the first property, fall back if it disappears" logic already existed in the view and are kept.

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| Channex not connected, or reconnect required (409) | Hook test and view test, both error codes | No picker and no sentence, because the status card already explains it. Nothing is logged. |
| Host has no properties (`hostDashboard/all` 404) | Service test | Empty list, shown as "No properties are linked to Channex yet." |
| No room type is linked | Service test, view test | Empty list without calling `hostDashboard/all`. The same sentence is shown. |
| Server error, network failure or missing token | Service, hook and view tests | "We couldn't load your properties." The detail goes to the console. |
| `hostDashboard/all` fails with something other than 404 (for example 403 for a user outside the Host group) | Service test (500 and 403) | The same error sentence. |
| Host is not connected, or outside the allowlist | View test | No property request at all. |

None of these is a critical gap.

## Performance

`hostDashboard/all` builds the full object for every property of the host, which is heavy for an id and a title. It is skipped when nothing is linked and called once per connect. Caching was not added.

## Not in scope

- Filtering mappings by status. The `channel_integration_room_type.status` column is a free `varchar` with no defined values, and the code only ever writes `"ACTIVE"`. Every mapping is included for now. Open question for the backend owner.
- A lighter endpoint than `hostDashboard/all`, because the endpoint was fixed by the project decision.
- The Last sync card and the Property mapping table, which come in the next two PRs.
- 9 failing tests in `listingDetails2.test.js` and 4 ESLint errors in `ChannexDiagnosticsPanel.test.js`. Both exist on untouched `origin/acceptance` (`ce716e4fa`).
- Backend code, the allowlist, and any Channex write route. `MOCK_CONNECT_FLOW_ENABLED` stays `false`.
