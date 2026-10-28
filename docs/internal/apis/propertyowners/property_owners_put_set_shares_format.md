# Property owners: PUT set-shares

Back to the [overview](./property_owners.md). Authentication, the common errors and the [period model](./property_owners.md#ownership-periods) are described there.

## Set the shares of a property

`PUT {baseUrl}?action=set-shares`

Headers: `Authorization: <Cognito access token>`, `Content-Type: application/json`

| Query | Rules |
| ----- | ----- |
| `action` | `set-shares`, exactly in this case |
| `id` | Not allowed. With `id` the router answers `405` |

Sets **all** shares of one property from one date. Owners who are left out of the list hold no share of the property from that date.

```json
{
  "property_id": "e65ceab8-f77e-4d6f-b1f3-198f41b47f3e",
  "effective_from": 1793491200000,
  "shares": [
    { "owner_id": "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b", "ownership_basis_points": 6000 },
    { "owner_id": "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", "ownership_basis_points": 4000 }
  ]
}
```

### Body fields
The body has exactly these three fields, in any order.

| Field | Rules |
| ----- | ----- |
| `property_id` | String. Trimmed. Not blank, at most 255 characters, no control characters. The trimmed value is used |
| `effective_from` | Integer, epoch milliseconds at a UTC midnight, not before today (UTC) |
| `shares` | Array of at most 100 entries. May be empty |

Each entry of `shares` has exactly these two fields:

| Field | Rules |
| ----- | ----- |
| `owner_id` | A UUID, any letter case. Stored in lowercase |
| `ownership_basis_points` | Integer from 1 to 10000 |

- Each owner appears at most once, compared after lowercasing.
- A non-empty list adds up to exactly 10000.
- An empty list ends all ownership of the property from `effective_from`.

The checks run in this order, and the first failure is returned: body shape, `property_id`, `effective_from`, `shares` list, each entry in list order, duplicate owners, total.

### What is written
In one transaction, rerun as a whole on a DSQL conflict:

1. Lock the property, scoped to the caller's host (`property.hostid`). Not found: `404` `Property not found.`
2. Lock the owners in the list, scoped to the caller's host. Any one not found: `404` `Owner not found.` Any one archived: `409`. The property check comes first. An empty list skips the owner lookup.
3. Delete every period of the property, for every owner, that starts on or after `effective_from`. This replaces earlier planned changes from that date.
4. Close every period of the property that starts before `effective_from` and is open or ends after it. Its `effective_to` becomes `effective_from`.
5. Insert one open period per entry, starting at `effective_from`.
6. Read the current and upcoming periods of the property for the response.

Periods that ended on or before `effective_from` are not touched.

### Responses

`200`:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `property_id` | string | The trimmed `property_id` |
| `property_title` | string | |
| `as_of` | number | Today, the UTC midnight the split below is based on |
| `current` | array | Periods current on `as_of` |
| `upcoming` | array | Periods that start after `as_of` |

Each entry of `current` and `upcoming` has `owner_id`, `ownership_basis_points`, `effective_from` and `effective_to`. Both lists are ordered by `effective_from` and then by creation time.

Example: today is 26 October 2026 (`1792972800000`). Owner A held 100% since 1 July. The request above gives A 60% and B 40% from 1 November.

```json
{
  "property_id": "e65ceab8-f77e-4d6f-b1f3-198f41b47f3e",
  "property_title": "Charming Windmill Stay",
  "as_of": 1792972800000,
  "current": [
    {
      "owner_id": "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "ownership_basis_points": 10000,
      "effective_from": 1782864000000,
      "effective_to": 1793491200000
    }
  ],
  "upcoming": [
    {
      "owner_id": "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "ownership_basis_points": 6000,
      "effective_from": 1793491200000,
      "effective_to": null
    },
    {
      "owner_id": "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      "ownership_basis_points": 4000,
      "effective_from": 1793491200000,
      "effective_to": null
    }
  ]
}
```

With `effective_from` equal to today, the new periods are in `current`, and `upcoming` is empty.

| Status | Message | When |
| ------ | ------- | ---- |
| 400 | `Request body must be valid JSON.` | The body is missing or is not valid JSON |
| 400 | `Request body must be a JSON object.` | |
| 400 | `Unknown fields: <fields>.` | Any field other than the three, such as `host_id` |
| 400 | `Missing fields: <fields>.` | |
| 400 | `property_id is required.` | `null`, or blank after trimming |
| 400 | `property_id must be a string.` | |
| 400 | `property_id contains invalid characters.` | A control character (U+0000 to U+001F, or U+007F) |
| 400 | `property_id must be at most 255 characters.` | |
| 400 | `effective_from must be an integer in epoch milliseconds.` | |
| 400 | `effective_from must be a UTC midnight.` | |
| 400 | `effective_from cannot be before today.` | Today is the UTC date of the server clock |
| 400 | `shares must be an array.` | |
| 400 | `shares must contain at most 100 entries.` | |
| 400 | `Each share must be an object.` | |
| 400 | `Each share must contain exactly owner_id and ownership_basis_points.` | |
| 400 | `A valid owner id is required.` | An `owner_id` is not a UUID |
| 400 | `ownership_basis_points must be an integer from 1 to 10000.` | |
| 400 | `Each owner can appear only once.` | |
| 400 | `Shares must add up to exactly 10000 basis points.` | |
| 404 | `Property not found.` | No such property for the caller's host |
| 404 | `Owner not found.` | An owner in the list does not exist for the caller's host |
| 409 | `Archived owners cannot receive ownership shares.` | An owner in the list is archived |
| 409 | `The ownership of this property changed at the same time. Reload and try again.` | A write conflict outlasted the retries, or the database reported a duplicate period |
| 401, 403, 405, 500 | see the [overview](./property_owners.md#common-responses) | |
