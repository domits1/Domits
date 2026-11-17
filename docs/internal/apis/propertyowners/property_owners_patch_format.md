# Property owners: PATCH

Back to the [overview](./property_owners.md). Authentication, the common errors and the period model are described there.

## Update an owner

`PATCH {baseUrl}?id={ownerId}`

Headers: `Authorization: <Cognito access token>`, `Content-Type: application/json`

| Query | Rules |
| ----- | ----- |
| `id` | Required. A UUID, any letter case. Without `id` the router answers `405` |

Send only the fields to change. A field that is not in the body keeps its value.

```json
{
  "phone": null,
  "status": "inactive"
}
```

### Rules

- The fields and their checks are the same as on create, see [owner fields](./property_owners_post_format.md#owner-fields). The fields of the body are checked in the order they appear in the body.
- At least one field is required.
- `null` clears an optional field. For a required field, including `status`, `null` fails with `<field> is required.`
- `status` can be set to `active`, `inactive` or `pending`. This is also how an archived owner is restored. `archived` is refused here. Use [archive](#archive-an-owner).
- The company name rule is checked against the stored owner with the changes applied:
  - A stored `company` with a company name cannot clear it: `{ "company_name": "" }` fails.
  - A stored `individual` without a company name cannot become a company on its own: `{ "owner_type": "company" }` fails. Send `company_name` in the same request.
  - A stored `company` can become a `trust`, because the stored company name still applies.
- An archived owner can be edited without being restored.
- Only the changed fields and `updated_at` are written. The write is scoped to the owner id and the caller's host.

### Responses

`200`, the owner as [GET](./property_owners_get_format.md#read-one-owner) returns it after the write, with current `properties` and their titles.

```json
{
  "id": "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
  "host_id": "ce93f377-9ac0-46c2-9d45-cf20d33dcc33",
  "first_name": "Anna",
  "last_name": "de Vries",
  "company_name": null,
  "email": "anna@example.com",
  "phone": null,
  "preferred_language": "nl-NL",
  "owner_type": "individual",
  "status": "inactive",
  "notes": null,
  "owner_user_id": null,
  "created_at": 1781256600000,
  "updated_at": 1793023500000,
  "properties": [
    {
      "property_id": "e65ceab8-f77e-4d6f-b1f3-198f41b47f3e",
      "property_title": "Charming Windmill Stay",
      "ownership_basis_points": 6000,
      "effective_from": 1782864000000,
      "effective_to": null
    }
  ]
}
```

| Status | Message | When |
| ------ | ------- | ---- |
| 400 | `Request body must be valid JSON.` | The body is missing or is not valid JSON |
| 400 | `A valid owner id is required.` | `id` is empty or not a UUID. Checked before any database read |
| 404 | `Owner not found.` | No owner with this id for the caller's host. Checked before the body is validated |
| 400 | `Request body must be a JSON object.` | |
| 400 | `Unknown or read-only fields: <fields>.` | Such as `id`, `host_id`, `owner_user_id`, `created_at`, `updated_at` or `properties` |
| 400 | `At least one field is required to update an owner.` | The body is `{}` |
| 400 | any field message from [create](./property_owners_post_format.md#responses) | |
| 400 | `status archived can only be set by archiving the owner.` | |
| 400 | `company_name is required when owner_type is company or trust.` | Checked against the stored owner with the changes applied |
| 404 | `Owner not found.` | The write changed no row |
| 500 | `Something went wrong, please contact support.` | Including a write conflict that outlasts the retries |
| 401, 403, 405 | see the [overview](./property_owners.md#common-responses) | |

## Archive an owner

`PATCH {baseUrl}?action=archive&id={ownerId}`

Headers: `Authorization: <Cognito access token>`

| Query | Rules |
| ----- | ----- |
| `action` | `archive`, exactly in this case |
| `id` | Required. A UUID, any letter case. Without `id` the router answers `405` |

The body is ignored and never parsed. A missing or malformed body does not cause a `400`.

### Rules
In one transaction, rerun as a whole on a DSQL conflict:

1. Lock the owner row of the caller's host.
2. Read the owner's current and upcoming periods on any property: `effective_to` is `null` or later than today.
3. No such owner: `404`. Any such period: `409`. Change the shares of those properties first with [set-shares](./property_owners_put_set_shares_format.md).
4. Already archived: nothing is written, and `updated_at` stays the same. Archiving twice answers `200` both times.
5. Otherwise set `status` to `archived` and `updated_at` to the server time.

Archive never changes ownership periods. Periods that ended before today stay as history.

### Responses

`200`, the owner as [GET](./property_owners_get_format.md#read-one-owner) returns it after the archive. `properties` is empty, because an owner with a current share cannot be archived.

```json
{
  "id": "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
  "host_id": "ce93f377-9ac0-46c2-9d45-cf20d33dcc33",
  "first_name": "Anna",
  "last_name": "de Vries",
  "company_name": null,
  "email": "anna@example.com",
  "phone": null,
  "preferred_language": "nl-NL",
  "owner_type": "individual",
  "status": "archived",
  "notes": null,
  "owner_user_id": null,
  "created_at": 1781256600000,
  "updated_at": 1793023500000,
  "properties": []
}
```

| Status | Message | When |
| ------ | ------- | ---- |
| 400 | `A valid owner id is required.` | `id` is empty or not a UUID. Checked before any database read |
| 404 | `Owner not found.` | No owner with this id for the caller's host |
| 409 | `This owner still holds ownership shares. Set new shares for these properties first.` | The owner has a current or upcoming period |
| 409 | `This owner changed at the same time. Reload and try again.` | A write conflict outlasted the retries |
| 401, 403, 405, 500 | see the [overview](./property_owners.md#common-responses) | |
