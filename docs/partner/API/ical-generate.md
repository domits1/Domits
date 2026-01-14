# API Template

## Description
The iCal Generate API creates an iCal (.ics) file based on availability or booking events provided to the API.
The generated calendar can be downloaded or subscribed to by external calendar tools such as Google Calendar or other platforms that support iCal.

This API is used to export calendar data from Domits in a standard format.

## Metadata
Lambda Function: Ical-generate

Related Issue: ...

Status: **In Development** (Active | Deprecated | In Development)

## Working Endpoints

| Action | Description                                    | Auth Required                   | Endpoint      |
| ------ | ---------------------------------------------- | ------------------------------- | ------------- |
| POST    | Generates an iCal (.ics) file from event data | Yes                             | /Ical-generate|

## Base URL 
```
https://rphw3xutc9.execute-api.eu-north-1.amazonaws.com/default/Ical-generate
```

## Security & Authorization
Depends and changes based on the situation:

    •	If an Authorization token is provided, it is checked for existence.
	•	If no token is provided, the request is still allowed.
	•	If a token is expected but missing in certain flows, the API may return 401.

Recommended next steps:
    •   Use a signed/unguessable feed URL (e.g., /Ical-generate?feedToken=<random>) and keep it public.
    •   Add rate limiting and logging (API Gateway usage plan / CloudWatch metrics).

## Calculation / Logic Overview
High-level flow:
 	1.	Client sends a POST request with event data

	2.	API validates:
	•	events must be an array

	3.	The service builds a valid iCal document:
	•	BEGIN:VCALENDAR
	•	One VEVENT per event
    
	4.	The API returns the .ics file as a downloadable response

## Class Diagram
Show your class in a Diagram. Use [Mermaid Flow](https://mermaid.live/). Github supports mermaid chart in .md

## Sequence Diagram
Use [Mermaid Live Editor](https://mermaid.live/) and its examples to make a Sequence Diagram for a POST request

Example:

![bookingsequence](../../images/bookingsequence.png)

## Request Examples

### POST

/Ical-generate?accommodationId=<uuid>

## Response examples 

### 200 OK 
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Domits/Domits Calendar//v1.0//EN
X-WR-CALNAME:Domits Export
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:booking-123
DTSTAMP:20260107T100000Z
DTSTART:20260110T140000Z
DTEND:20260112T100000Z
SUMMARY:Blocked (Booking 123)
DESCRIPTION:Imported from Domits
LOCATION:Amsterdam
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR

```
### 400 Bad request
```
{
  "message": "Missing required query parameter"
}
```

### 401 Unauthorized
```
{
  "message": "No authorization token provided."
}
```

### 500 Internal server error (unexpected)
```
{
  "error": "Unexpected server error"
}
```


## Todo & Improvements
	•	Store generated .ics files in S3 and expose them via signed URLs
	•	Add recurring event support (RRULE)
	•	Add stronger authentication (JWT validation)
	•	Add logging and monitoring
	•	Generate calendars directly from booking data instead of request input

