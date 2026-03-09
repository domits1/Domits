# iCal import

## Description
The iCal Retrieve API imports external `.ics` feeds (for example Airbnb/Booking/Google calendars) and converts them into blocked date data for Domits listings.

It powers the Host Dashboard Calendar & Pricing sync flow:
- add/edit/delete connected sources
- refresh one source
- refresh all sources
- list merged blocked dates per property

## Metadata
Lambda Function: `Ical-retrieve`  
Database Table: `property_ical_source`  
Status: **Active**

## Base URL
Canonical:
```text
https://eiul3lr63m.execute-api.eu-north-1.amazonaws.com/default/ical-retrieve
```

Legacy compatibility (still active):
```text
https://eiul3lr63m.execute-api.eu-north-1.amazonaws.com/default/Ical-retrieve
```

## Working endpoints

| Method | Action            | Description                                        | Auth Required | Canonical Endpoint |
| ------ | ----------------- | -------------------------------------------------- | ------------- | ------------------ |
| POST   | RETRIEVE_EXTERNAL | Download and parse an external iCal feed           | Yes           | /ical-retrieve     |
| POST   | LIST_SOURCES      | List stored sources and merged blocked dates       | Yes           | /ical-retrieve     |
| POST   | UPSERT_SOURCE     | Create or update one source and refresh it         | Yes           | /ical-retrieve     |
| POST   | DELETE_SOURCE     | Delete one source                                  | Yes           | /ical-retrieve     |
| POST   | REFRESH_SOURCE    | Refresh one source by `sourceId`                   | Yes           | /ical-retrieve     |
| POST   | REFRESH_ALL       | Refresh all sources for one property               | Yes           | /ical-retrieve     |

Compatibility note:
- `/Ical-retrieve` currently remains available to avoid breaking older clients.
- New integrations should always use `/ical-retrieve`.

## Security and authorization
- `Authorization` token is required.
- Property ownership is validated for source management actions (`LIST_SOURCES`, `UPSERT_SOURCE`, `DELETE_SOURCE`, `REFRESH_SOURCE`, `REFRESH_ALL`).

Token extraction supports common API Gateway event shapes:
- `headers.Authorization` / `headers.authorization`
- `multiValueHeaders.Authorization[0]` / `multiValueHeaders.authorization[0]`
- `event.authorizationToken`

## Logic overview
1. Client sends `POST` with an `action`.
2. Controller validates auth and payload.
3. Service executes action:
   - external fetch + iCal parse
   - blocked date extraction
   - source upsert/delete/list refresh
4. Repository persists data in `property_ical_source`.
5. Response returns normalized `sources` + `blockedDates` (for source actions), or parsed events (for `RETRIEVE_EXTERNAL`).

## Request examples

### RETRIEVE_EXTERNAL
```json
{
  "action": "RETRIEVE_EXTERNAL",
  "calendarUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics"
}
```

### UPSERT_SOURCE
```json
{
  "action": "UPSERT_SOURCE",
  "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c",
  "calendarName": "Airbnb - City Loft",
  "calendarUrl": "https://www.airbnb.com/calendar/ical/123456789.ics?s=example",
  "calendarProvider": "airbnb"
}
```

### LIST_SOURCES
```json
{
  "action": "LIST_SOURCES",
  "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c"
}
```

### REFRESH_SOURCE
```json
{
  "action": "REFRESH_SOURCE",
  "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c",
  "sourceId": "src_a1b2c3d4"
}
```

## Response examples

### 200 OK (source actions)
```json
{
  "sources": [
    {
      "propertyId": "3763b443-6a49-476f-a7fa-5c39288cc21c",
      "sourceId": "src_a1b2c3d4",
      "calendarName": "Airbnb - City Loft",
      "calendarUrl": "https://www.airbnb.com/calendar/ical/123456789.ics?s=example",
      "provider": "airbnb",
      "lastSyncAt": "2026-03-09T12:41:00.000Z",
      "updatedAt": "2026-03-09T12:41:00.000Z",
      "etag": "\"abc123\"",
      "lastModified": "Mon, 09 Mar 2026 12:40:00 GMT"
    }
  ],
  "blockedDates": ["2026-03-10", "2026-03-11", "2026-03-12"]
}
```

### 400 Bad request
```json
{
  "message": "propertyId is required"
}
```

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

## Validation URLs
Useful public test feeds:
- `https://www.calendarlabs.com/ical-calendar/ics/76/US_Holidays.ics`
- `https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics`
- `https://www.officeholidays.com/ics-local-name/netherlands`
