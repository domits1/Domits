## Update the registration number of a property

Changes only `property.registrationnumber` for one property. It is the same value the host enters during onboarding
(`POST /property`), so there is a single source of truth. Used by the host settings Compliance page
(`/hostdashboard/settings/compliance`).

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/registration`

Headers: `Authorization: <Cognito access token>` (same convention as the other PropertyHandler endpoints, no `Bearer` prefix).

```json
{
    "method": "PATCH",
    "body": {
        "propertyId": "String",
        "registrationNumber": "String"
    }
}
```

### Authorization

Owner-based access control: the caller must be the host that owns `propertyId` (`authorizeOwnerRequest`).

### Validation (business layer)

- `registrationNumber` must be a string. It is trimmed before it is checked and stored.
- Empty after trimming: `400`.
- Exactly the generated placeholder shape, `AUTO-` followed by a UUID (case-insensitive): `400`. `AUTO-<uuid>` is what the backend generates when no number was given (`propertyBuilder.js`), so it can never be stored as a real number. Other values that merely start with `AUTO-`, such as `Auto-1234`, are real numbers and are accepted.
- Longer than 255 characters: `400` (column is `VARCHAR(255)`).
- Used by another property: `409`. Detected by a pre-check for another property with the same number and a different id. The unique index on the column remains as a backstop: a `23505` error from the update is also returned as `409`.

### Responses

`200`, body is the stored (trimmed) value. Clients must use this value as the new saved value:

```json
{
    "propertyId": "String",
    "registrationNumber": "String"
}
```

Error responses have the body `{ "message": "String" }`. Clients should map on the HTTP status code, not on the message:

| Status | Meaning |
|--------|---------|
| 400 | Missing `propertyId`, or the registration number failed validation |
| 403 | The caller does not own the property |
| 404 | The property does not exist |
| 409 | The registration number is already used by another listing |
| 500 | Unexpected error |

### Manual API Gateway steps

This repository has no infrastructure as code, so the route has to be created by hand in the AWS console
(region `eu-north-1`):

1. Under the existing `/property` resource, create a child resource `/registration`.
2. Add a `PATCH` method on it with a Lambda proxy integration pointing at the same `PropertyHandler` Lambda that serves `/property/overview`.
3. Enable CORS on the resource (`OPTIONS` method), matching the configuration of `/property/overview`.
4. Deploy the API to the same stage that `/property/overview` is deployed to.
5. Confirm the Lambda resource policy allows invocation from the new method (it normally covers the whole API already).

> **Backend deploy + API Gateway route must be live before the frontend Compliance page is released.**
> Until then the page can load listings but every save fails with a generic error.
