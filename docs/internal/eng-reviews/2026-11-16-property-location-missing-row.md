# fix(property): create the location of a listing that has none yet

Pull request: (to be linked)
Issue: none; reported by Elias in the team chat on 16 Nov (Villa Malee shows "Unknown city", saving the address fails with "Failed to update property location.")
Reviewed commit: staged diff on `fix/property-location-missing-row`
Result: no blocking findings

```
edit form ── save ──▶ updatePropertyOverview (authorizeOwnerRequest)
                          ▼
                     updateLocation(propertyId, location)
                          ├─ no property_location row ──▶ createLocation (insert, geocode, map destination)
                          └─ row exists ───────────────▶ updatePropertyLocationById (as before)
```

## Cause

Confirmed on DSQL: `main.property_location` has no row for Villa Malee. `updatePropertyLocationById` runs an `UPDATE ... WHERE property_id = ...`, which changes nothing, then reads the row back, gets nothing, and `propertyService.updateLocation` throws "Failed to update property location." Villa Jasmine has a row, so the same form works there. The listing card shows "Unknown city" because `HostListings.js` falls back to it when `location.city` is empty.

## Findings

### Commit 1: `updateLocation` creates a missing location

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | `propertyService.js`, `updateLocation` | Reads the row first; none means `createLocation({ ...location, property_id })`, the same path as a new listing (insert, best-effort geocoding, destination mapping). The fix sits in the business layer, which decides; the repository keeps only reading and writing. | No change. |
| Checked | `propertyController.js:570`, `authorizeOwnerRequest(accessToken, propertyId)` | The only caller is `updatePropertyOverview`, which checks the host owns the property before any location write, so the new insert cannot create a location for someone else's listing. | No change. |
| P3 (6/10) | `propertyService.js`, read then insert | Two saves at the same moment can both see no row; `property_id` is the primary key, so the second insert fails and that save shows an error while the first one wins. | Accepted: one host saving one form twice at the same instant; the result is an error, not wrong data. |
| P3 (5/10) | `Property_Location` model, `NOT NULL` on street, housenumber, postalcode, city, country | A save with one of these empty fails on insert, as the same save would fail on update. | Accepted: unchanged behaviour. |
| Checked | tests | New file covers both paths (missing row creates, existing row updates and does not create); `propertyLocationDestinationHook.test.js` gets `getPropertyLocationById` in its fake repository, same commit, so it keeps testing the update path. | No change. |

## Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| Insert refused (missing field, primary key race) | No | `createLocation` throws "Failed to register property location." | The form shows the error, as before |
| Geocoding fails | No (existing behaviour) | Best effort, coordinates stay empty | Map pin missing; address saved |

## Not in scope

- **Why the row was never created.** `mapDraft` shows listings now start as drafts with an `address_line`; if that flow never writes `property_location`, every new draft has the same gap. Follow-up: count listings without a location row and trace the draft flow.
- Fixing Villa Malee's row by hand: the fix makes the next save create it.
