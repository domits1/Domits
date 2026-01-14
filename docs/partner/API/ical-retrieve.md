# API Template

## Description
The iCal Retrieve API downloads an external iCal (.ics) calendar from a given URL (for example Airbnb/Booking) and converts it into a simple JSON list of events.

This is used for importing blocked or reserved periods from external channels into Domits.

## Metadata
Lambda Function: Ical-retrieve
Status: In Development

Related Issue: ...

Status: **In Development** (Active | Deprecated | In Development)

## Working Endpoints
Use https://tabletomarkdown.com/generate-markdown-table/ to simply make your own table.

| Action | Description          | Auth Required                   | Endpoint |
| ------ | -------------------- | ------------------------------- | -------- |
| POST   | Create new resource  | Yes                             | /Ical-retrieve|

## Base URL 
```
https://eiul3lr63m.execute-api.eu-north-1.amazonaws.com/default/Ical-retrieve
```

## Security & Authorization

    Authentication is required in the current implementation.
	•	The Lambda tries to read the token from multiple common API Gateway locations:
	•	headers.Authorization / headers.authorization
	•	multiValueHeaders.Authorization[0] / multiValueHeaders.authorization[0]
	•	event.authorizationToken
	•	If no token is found, the API returns:

Recommended next steps:
    •   Replace “token exists” validation with real JWT verification (Cognito / JWKS / issuer + audience checks).
    •   Add rate limiting (API Gateway usage plan) to protect from excessive external calendar fetches.

## Calculation / Logic Overview
High-level flow:
	1.	Client sends a POST request with calendarUrl

	2.	Lambda checks that an authorization token exists (401 if missing)

	3.	Lambda validates calendarUrl (400 if invalid)

	4.	The service downloads the external .ics file using fetch()
	if the response is not OK: 400 with the HTTP status
	if fetch fails: 400 "Could not download external calendar URL"

	5.	The .ics text is parsed into events by scanning:
	BEGIN:VEVENT → start event
	END:VEVENT → finish event

	6.	Only a small set of fields is extracted:
	UID, DTSTAMP, DTSTART, DTEND, SUMMARY, LOCATION, STATUS

    7. API returns JSON with events

## Class Diagram
Show your class in a Diagram. Use [Mermaid Flow](https://mermaid.live/). Github supports mermaid chart in .md

## Sequence Diagram
Use [Mermaid Live Editor](https://mermaid.live/) and its examples to make a Sequence Diagram for a POST request

Example:

![bookingsequence](../../images/bookingsequence.png)

## Request Examples

### POST 
```json
{
  "httpMethod": "POST",
  "headers": {
    "Authorization": "Bearer <access-token>"
  },
  "body": "{\"calendarUrl\":\"https://example.com/calendar.ics\"}"
}

```
### GET
Use https://tabletomarkdown.com/generate-markdown-table/ to simply make your own table.

| `readType`  | Description                                       | Auth | Example                                                               |
| ----------- | ------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| `guest`     | Fetch all bookings of a guest                     | ✅    | `/bookings?readType=guest`                                            |
| `hostId`    | Fetch all bookings for properties owned by a host | ✅    | `/bookings?readType=hostId`                                           |
| `createdAt` | Get bookings created after a certain date         | ❌    | `/bookings?readType=createdAt&property_Id=<id>&createdAt=<timestamp>` |
| `paymentId` | Get booking via Stripe payment ID                 | ✅    | `/bookings?readType=paymentId&paymentID=pi_3S5nsgGiInrsWMEc0djWC2YZ`  |


## Response examples 

### 200 OK 
```
{
  {"events":[{"Summary":"New Year's Day","Dtstart":"20250101","Dtend":"20250101","Location":"United States","UID":"6932e11920fef1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"M L King Day","Dtstart":"20250120","Dtend":"20250120","Location":"United States","UID":"6932e119210031764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Presidents' Day","Dtstart":"20250217","Dtend":"20250217","Location":"United States","UID":"6932e119210101764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Good Friday","Dtstart":"20250418","Dtend":"20250418","Location":"United States","UID":"6932e1192101c1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Easter Sunday","Dtstart":"20250420","Dtend":"20250420","Location":"United States","UID":"6932e119210271764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Memorial Day","Dtstart":"20250526","Dtend":"20250526","Location":"United States","UID":"6932e119210321764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Juneteenth","Dtstart":"20250619","Dtend":"20250619","Location":"United States","UID":"6932e1192103d1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Independence Day","Dtstart":"20250704","Dtend":"20250704","Location":"United States","UID":"6932e119210481764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Labor Day","Dtstart":"20250901","Dtend":"20250901","Location":"United States","UID":"6932e119210541764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Columbus Day","Dtstart":"20251013","Dtend":"20251013","Location":"United States","UID":"6932e1192105f1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Veterans Day","Dtstart":"20251111","Dtend":"20251111","Location":"United States","UID":"6932e1192106b1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Thanksgiving Day","Dtstart":"20251127","Dtend":"20251127","Location":"United States","UID":"6932e119210771764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Christmas","Dtstart":"20251225","Dtend":"20251225","Location":"United States","UID":"6932e119210821764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"New Year's Day","Dtstart":"20260101","Dtend":"20260101","Location":"United States","UID":"6932e1192108e1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"M L King Day","Dtstart":"20260119","Dtend":"20260119","Location":"United States","UID":"6932e1192109a1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Presidents' Day","Dtstart":"20260216","Dtend":"20260216","Location":"United States","UID":"6932e119210a61764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Good Friday","Dtstart":"20260403","Dtend":"20260403","Location":"United States","UID":"6932e119210b11764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Easter Sunday","Dtstart":"20260405","Dtend":"20260405","Location":"United States","UID":"6932e119210c21764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Memorial Day","Dtstart":"20260525","Dtend":"20260525","Location":"United States","UID":"6932e119210ce1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Juneteenth","Dtstart":"20260619","Dtend":"20260619","Location":"United States","UID":"6932e119210da1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Independence Day Holiday","Dtstart":"20260703","Dtend":"20260703","Location":"United States","UID":"6932e119210e61764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Independence Day","Dtstart":"20260704","Dtend":"20260704","Location":"United States","UID":"6932e119210f21764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Labor Day","Dtstart":"20260907","Dtend":"20260907","Location":"United States","UID":"6932e119210fe1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Columbus Day","Dtstart":"20261012","Dtend":"20261012","Location":"United States","UID":"6932e1192110a1764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Veterans Day","Dtstart":"20261111","Dtend":"20261111","Location":"United States","UID":"6932e119211171764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Thanksgiving Day","Dtstart":"20261126","Dtend":"20261126","Location":"United States","UID":"6932e119211241764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"},{"Summary":"Christmas","Dtstart":"20261225","Dtend":"20261225","Location":"United States","UID":"6932e119211301764942105@calendarlabs.com","Dtstamp":"20251205T084145Z","Status":"CONFIRMED"}]}
}
```
### 400 Bad request
```
{
  "message": "calendarUrl is required"
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
   	•	Add real JWT validation (Cognito / JWKS, issuer + audience)
	•	Add rate limiting to prevent abuse (external fetching)
	•	Improve parsing:
	•	Support DESCRIPTION, SEQUENCE, LAST-MODIFIED
	•	Better timezone handling (DTSTART;TZID=...)
	•	Add support for recurring events (RRULE)
	•	Add logging/metrics for fetch failures and parsing results


