# iCal export

## Description
The iCal Generate API creates an iCal (`.ics`) file based on calendar state from Domits.
The state of the calendar contains information such as blocked dates, planned maintenance, booked dates and available dates.

The generated iCal file can be downloaded or used as an import link in external platforms like Airbnb, Booking.com, or Google Calendar.
This allows external systems to stay in sync with the Domits calendar.

This API is used in Domits to export calendar data.

## Metadata
Lambda Function: `Ical-generate`

Related Issue: `587`

Status: **In Development**

## Working Endpoints

| Action | Description                                    | Auth Required | Endpoint |
| ------ | ---------------------------------------------- | ------------- | -------- |
| POST   | Generates an iCal (`.ics`) file from events    | Optional      | /Ical-generate |
| GET    | Generates an iCal (`.ics`) file from events    | Optional      | /Ical-generate |

## Base URL
```text
https://rphw3xutc9.execute-api.eu-north-1.amazonaws.com/default/Ical-generate
```

## Security & Authorization
Depends on the request:
- If an Authorization token is provided, token presence is validated.
- If no token is provided, the request is currently still allowed.

Recommended next steps:
- Use a signed/unguessable feed URL (for example `feedToken`) when exposing public feeds.
- Add rate limiting and logging (API Gateway usage plan and CloudWatch metrics).

## Calculation / Logic Overview
1. Frontend (Host Calendar / iCal Sync)
Sends events to `/Ical-generate`.

2. controller/controller.js
Reads authorization token (if present), parses body, and forwards event data to the service.

3. auth/authManager.js
Checks token presence only when token is provided.

4. business/service/service.js
Validates that `events` is an array and prepares the data.

5. util/icalBuilder.js
Builds a valid iCal (`VCALENDAR` + `VEVENT`).

6. util/http.js
Returns the iCal response with download headers.

7. Client / External Platform
Receives the `.ics` response and imports/subscribes to it.

## Request Examples
```json
{
  "calendarName": "Domits Export",
  "filename": "domits-export.ics",
  "events": [
    {
      "UID": "booking-123",
      "Dtstamp": "2026-01-07T10:00:00Z",
      "Dtstart": "2026-01-10T14:00:00Z",
      "Dtend": "2026-01-12T10:00:00Z",
      "Summary": "Blocked (Booking 123)",
      "Description": "Imported from Domits",
      "Location": "Amsterdam",
      "Status": "CONFIRMED"
    }
  ]
}
```

## Response examples

### 200 OK
Returns raw `.ics` content in the response body.

Headers:
- `Content-Type: text/calendar; charset=utf-8`
- `Content-Disposition: attachment; filename="<filename>"`
- `Cache-Control: no-store`

Example response body:
```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Domits//EN
BEGIN:VEVENT
UID:booking-123
DTSTART:20260110T140000Z
DTEND:20260112T100000Z
SUMMARY:Blocked (Booking 123)
END:VEVENT
END:VCALENDAR
```

### 400 Bad request
```json
{
  "message": "events must be an array"
}
```

### 500 Internal server error
```json
{
  "message": "Internal error"
}
```

## Todo & Improvements
- Create one fixed export link per property so external calendars can keep using the same URL.
- Store generated iCal files in S3 when stable feed URLs are required.
- Add stronger auth rules for private export flows.

## Validating
- Validate generated `.ics` output with `https://www.icalvalidator.com/index.html`.
- Import the generated calendar in a sandbox external calendar and verify blocked dates.

## Important behavior note
- With current Lambda code, missing Authorization does not return `401` for this endpoint.
- A `401` can still occur if an upstream API Gateway/Cognito authorizer is configured to enforce auth before Lambda executes.
