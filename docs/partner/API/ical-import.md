# iCal import

## Description
The iCal Retrieve API downloads an external iCal (`.ics`) calendar from a given URL (for example Airbnb or Booking) and converts it into event data that Domits can use for blocked dates.

Domits uses this to import blocked or reserved periods from external channels, so these dates can be shown as blocked in the Domits host calendar.

## Metadata
Lambda Function: `Ical-retrieve`
Status: In development
Database Table: `property_ical_source`

Related Issue: `587`

Status: **In Development**

## Working Endpoints

| Method | Action            | Description                                              | Auth Required | Endpoint |
| ------ | ----------------- | -------------------------------------------------------- | ------------- | -------- |
| POST   | RETRIEVE_EXTERNAL | Download and parse an external iCal                      | Yes           | /Ical-retrieve |
| POST   | LIST_SOURCES      | List stored calendar sources + union blocked dates       | Yes           | /Ical-retrieve |
| POST   | UPSERT_SOURCE     | Save or update one external source and refresh it        | Yes           | /Ical-retrieve |
| POST   | DELETE_SOURCE     | Delete one stored source                                 | Yes           | /Ical-retrieve |
| POST   | REFRESH_ALL       | Refresh all stored sources for the property              | Yes           | /Ical-retrieve |

## Base URL
```text
https://eiul3lr63m.execute-api.eu-north-1.amazonaws.com/default/Ical-retrieve
```

## Security & Authorization
Authentication is required in the current implementation.

The Lambda tries to read the token from common API Gateway locations:
- `headers.Authorization` / `headers.authorization`
- `multiValueHeaders.Authorization[0]` / `multiValueHeaders.authorization[0]`
- `event.authorizationToken`

If no token is found, the API returns `401`.

Recommended next steps:
- Replace "token exists" validation with real JWT verification (Cognito / JWKS / issuer + audience checks).
- Add rate limiting (API Gateway usage plan) to protect from excessive external calendar fetches.
- Enforce property ownership checks for actions using `propertyId` (LIST/UPSERT/DELETE/REFRESH).

## Calculation / Logic Overview
High-level flow:
1. Frontend (host calendar sync utilities)
Sends a POST request to `/Ical-retrieve` with an `action` and required payload.

2. Controller (`controller/controller.js`)
Reads token, checks authorization, parses JSON body, and routes request based on `action`.

3. Auth (`auth/authManager.js`)
Checks if an authorization token is present and throws `401` when missing.

4. Service (`business/service/service.js`)
- `RETRIEVE_EXTERNAL`: validates URL, downloads `.ics`, parses events.
- `UPSERT_SOURCE`: parses blocked dates from `.ics` and stores source data.
- `LIST_SOURCES`/`DELETE_SOURCE`/`REFRESH_ALL`: manages stored sources and returns union blocked dates.

5. Repository (`data/repository.js`)
Reads/writes `property_ical_source`.

6. Response (`util/http.js`)
Returns JSON response with either event data, source data, or error payload.

## Request Examples

### 1) RETRIEVE_EXTERNAL
```json
{
  "action": "RETRIEVE_EXTERNAL",
  "calendarUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics"
}
```

### 2) UPSERT_SOURCE
```json
{
  "action": "UPSERT_SOURCE",
  "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c",
  "calendarName": "Airbnb - City Loft",
  "calendarUrl": "https://www.airbnb.com/calendar/ical/123456789.ics?s=example"
}
```

### 3) LIST_SOURCES
```json
{
  "action": "LIST_SOURCES",
  "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c"
}
```

### 4) DELETE_SOURCE
```json
{
  "action": "DELETE_SOURCE",
  "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c",
  "sourceId": "src_a1b2c3d4"
}
```

### 5) REFRESH_ALL
```json
{
  "action": "REFRESH_ALL",
  "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c"
}
```

## Response examples

### 200 OK (RETRIEVE_EXTERNAL)
```json
{
  "events": [
    {
      "UID": "booking-123",
      "Dtstart": "20260310",
      "Dtend": "20260313",
      "Summary": "Reserved"
    }
  ],
  "meta": {
    "etag": "\"abc123\"",
    "lastModified": "Mon, 02 Mar 2026 09:00:00 GMT"
  }
}
```

### 200 OK (LIST/UPSERT/DELETE/REFRESH)
```json
{
  "sources": [
    {
      "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c",
      "sourceId": "src_a1b2c3d4",
      "calendarName": "Airbnb - City Loft",
      "calendarUrl": "https://www.airbnb.com/calendar/ical/123456789.ics?s=example",
      "lastSyncAt": "2026-03-02T10:15:30.000Z",
      "updatedAt": "2026-03-02T10:15:30.000Z",
      "etag": "\"abc123\"",
      "lastModified": "Mon, 02 Mar 2026 09:00:00 GMT"
    }
  ],
  "blockedDates": [
    "2026-03-10",
    "2026-03-11",
    "2026-03-12"
  ]
}
```

### 400 Bad request
```json
{
  "message": "calendarUrl is required"
}
```

Other common `400` messages:
- `propertyId is required`
- `calendarName is required`
- `sourceId is required`
- `Unknown action`

### 401 Unauthorized
```json
{
  "message": "No authorization token provided."
}
```

### 500 Internal server error
```json
{
  "message": "Internal error"
}
```

## Todo & Improvements
- Improve error messages so it is clearer why an external calendar cannot be loaded.
- Persist explicit provider metadata (Airbnb/Booking/etc.) for more stable UI icon behavior.
- Add stronger auth checks for ownership by `propertyId`.
- Expand parser compatibility coverage for edge-case iCal feeds (timezone variants and complex recurrence patterns).

## Validating
For testing import functionality, you can use:
- `https://www.calendarlabs.com/ical-calendar/ics/76/US_Holidays.ics`
- `https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics`
- `https://www.officeholidays.com/ics-local-name/netherlands`

Also validate generated blocked date behavior in host calendar after source save/refresh.
