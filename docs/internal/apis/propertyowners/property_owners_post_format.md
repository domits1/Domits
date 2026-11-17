# Property owners: POST

Back to the [overview](./property_owners.md). Authentication, the common errors and the period model are described there.

## Create an owner

`POST {baseUrl}`

Headers: `Authorization: <Cognito access token>`, `Content-Type: application/json`

No query parameters. `POST ?id=…` or `POST ?action=…` answers `405`.

```json
{
  "first_name": "Anna",
  "last_name": "de Vries",
  "company_name": null,
  "email": "anna@example.com",
  "phone": "+31 6 12345678",
  "preferred_language": "nl-NL",
  "owner_type": "individual",
  "status": "active",
  "notes": "Prefers contact by email.\nAvailable on weekdays."
}
```

The new owner always belongs to the caller's host. `owner_user_id` is set to `null`, and `created_at` and `updated_at` are set to the server time.

## Owner fields
These rules apply to create and to [update](./property_owners_patch_format.md#update-an-owner).

| Field | Required on create | Max length | Rule |
| ----- | ------------------ | ---------- | ---- |
| `first_name` | yes | 100 | |
| `last_name` | yes | 100 | |
| `company_name` | when `owner_type` is `company` or `trust` | 200 | |
| `email` | yes | 254 | Matches `^[^\s@]+@[^\s@]+\.[^\s@.]+$`. Stored as sent, not lowercased |
| `phone` | no | 50 | At least one digit, and only digits, spaces and `+ ( ) - .` |
| `preferred_language` | no | 10 | `xx` or `xx-XX`, such as `en` or `nl-NL` |
| `owner_type` | yes | 20 | `individual`, `company` or `trust` |
| `status` | no, default `active` | 20 | `active`, `inactive` or `pending`. `archived` is refused |
| `notes` | no | 2000 | May contain tabs and line breaks |

Every field is checked the same way, in this order:

1. `null`, or a missing field: a required field fails with `<field> is required.` An optional field is stored as `null`. On create, a `null` or missing `status` becomes `active`.
2. Any other non-string, such as a number or a boolean: `<field> must be a string.`
3. A control character (U+0000 to U+001F, or U+007F): `<field> contains invalid characters.` `notes` allows tab, line feed and carriage return.
4. The value is trimmed. An empty result fails a required field with `<field> is required.`, and stores `null` for an optional field.
5. Longer than the maximum after trimming: `<field> must be at most <n> characters.` Length is counted in UTF-16 code units, so some emoji count as two.
6. The pattern or the allowed list, with the messages below.

The trimmed value is stored. The fields are checked in the order of the table, and the first failure is returned.

## Responses

`201`, the stored owner with `"properties": []`. See [the owner object](./property_owners_get_format.md#the-owner-object).

```json
{
  "id": "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
  "host_id": "ce93f377-9ac0-46c2-9d45-cf20d33dcc33",
  "first_name": "Anna",
  "last_name": "de Vries",
  "company_name": null,
  "email": "anna@example.com",
  "phone": "+31 6 12345678",
  "preferred_language": "nl-NL",
  "owner_type": "individual",
  "status": "active",
  "notes": "Prefers contact by email.\nAvailable on weekdays.",
  "owner_user_id": null,
  "created_at": 1793023500000,
  "updated_at": 1793023500000,
  "properties": []
}
```

| Status | Message | When |
| ------ | ------- | ---- |
| 400 | `Request body must be valid JSON.` | The body is missing or is not valid JSON |
| 400 | `Request body must be a JSON object.` | The JSON is `null`, an array, a string or a number |
| 400 | `Unknown or read-only fields: <fields>.` | Any field outside the table, such as `id`, `host_id`, `owner_user_id`, `created_at`, `updated_at` or `properties` |
| 400 | `<field> is required.` | A required field is missing, `null` or blank |
| 400 | `<field> must be a string.` | |
| 400 | `<field> contains invalid characters.` | |
| 400 | `<field> must be at most <n> characters.` | |
| 400 | `email must be a valid email address.` | |
| 400 | `phone must contain at least one digit and only digits, spaces and + ( ) - .` | |
| 400 | `preferred_language must be a language code such as en or nl-NL.` | |
| 400 | `owner_type must be one of: individual, company, trust.` | |
| 400 | `status must be one of: active, inactive, pending, archived.` | `status` is not in the list. The message lists `archived`, but see the next row |
| 400 | `status archived can only be set by archiving the owner.` | `status` is `archived` |
| 400 | `company_name is required when owner_type is company or trust.` | |
| 401, 403, 405, 500 | see the [overview](./property_owners.md#common-responses) | |
