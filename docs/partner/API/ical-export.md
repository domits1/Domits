# API Template

## Description
The iCal Generate API creates an iCal (.ics) file based on calendar state from Domits.
The state of the calendar contains information such as blocked dates, planned maintenance, booked dates and available dates.

The generated iCal file can be downloaded or used as a import link at calendars of external platforms like Airbnb, Booking.com, or Google Calendar. This allows external systems to stay in sync with the Domits calendar.

This API is used in Domits to export calendar data.

## Metadata
Lambda Function: Ical-generate

Related Issue: 587

Status: **In Development** (In Development)

## Working Endpoints

| Action | Description                                    | Auth Required                   | Endpoint      |
| ------ | ---------------------------------------------- | ------------------------------- | ------------- |
| POST    | Generates an iCal (.ics) file from events     | Yes                             | /Ical-generate|

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
1.	Frontend (Host Calendar / iCal Sync)
The frontend collects the current calendar state of the logged-in host and sends a POST request with an array of events to the iCal Generate API.

2.	controller/controller.js
The controller receives the request, reads the authorization token if present, parses the request body, and forwards the event data to the service.

3.	auth/authManager.js
If a token is provided, this file checks whether the token exists and throws an error if it is missing when required.

4.	business/service/service.js
The service validates that the events input is an array and prepares the data for calendar generation.

5.	util/icalBuilder.js
This file converts the events into a valid iCal (.ics) format by building a VCALENDAR with one VEVENT per event.

6.	util/http.js
The API response is created with the correct headers so the iCal file can be downloaded or used as a calendar feed.

7.	Client / External Platform
The client or external calendar tool receives the .ics file and imports or subscribes to it.

## Class Diagram
Show your class in a Diagram. Use [Mermaid Flow](https://mermaid.live/). Github supports mermaid chart in .md

## Sequence Diagram
Use [Mermaid Live Editor](https://mermaid.live/) and its examples to make a Sequence Diagram for a POST request

Example:

![bookingsequence](../../images/bookingsequence.png)

## Request Examples

```
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


### POST

/Ical-generate

## Response examples 

### 200 OK 
```
{"url":"https://ical-storage.s3.eu-north-1.amazonaws.com/host/public/domits-export-2026-01-27T10-20-37-219Z.ics?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIARVYQZJYAINGAQ2UQ%2F20260127%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20260127T102038Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA03f9ag7NYMCHwW3kLM4CZJHcZVrR380iji2rbYD5lVICICjQgkK26TGRA8xdqAy4SRrOfc%2FI8nmJhFcE4xeAivr7Ku8CCFMQABoMMTE1NDYyNDU4ODgwIgxKxyTfMfRdyOSM0wcqzAJ6go8betSZl2tMDw8JBsvPDFB1ym51ibHKeKUT2YAL9DfcQdHfaZJRZ7rl50ltDeb72QGGOn%2BSfsMJRKBmybtFaNB8GsUQ76vXJhbUB2js0%2FJeQZ6%2FmXCCmBBGrOmB12xvVk3U%2BvYAT276lRVHZ1tP5ooDCaxQbBgZO%2FBe0pW9k46NW7b0oX3xfrBwffiQW6S8Mge6VWOmxlVvBWdSkVq5ZcNmilBHVeWXjyydRb5M1cA2TZ%2F%2BeE6qa7Y5iPCzprQjar9Y%2BuD%2FJSbZpru%2BUCiMt%2FA2vGu3gmCaAIfoZzcQpNbZ9cLGACHJchMql8EGnu%2BZw9aKOP1KK2TuJPf%2BsUbOuXat7LGb%2BYaOH%2FJbPHh5qptIZxMRF2J%2BOQlJMX6ZrA8yGx91DzkNLG%2F16yY9J8SqAB%2FgxRI0%2BTnzWfaPFP4VyXfHi%2BimClqEsis0tzD0ouLLBjqeAUPWDKaDgTcw35tPIEqopK7x%2FTcpXB3qJ%2BVZjAcjOhA9fIWmbCEtnZ5GLcIDXgThVO50DKAvFf3oO5EWL3WlegAs%2BB%2FcAdqTiWkNOGdRhA1cMctUceAER8H0t1e1KUyOY7YtSgZ2t8yke%2BLp8pkVf3pikBd%2FEy%2F3g8%2BTVVf4dhGHl0ZOX8NcOamjYVtHmN6C3p%2FKwpB0yMW7m1DmC4a7&X-Amz-Signature=52777c2b35f48696fb99b3ff1010ca8d8b6d2ac6b6a43a5d5cfb56059a8c6e35&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"}

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
	•   Create one fixed export link per property so external calendars can keep using the same URL.
	•	Store the generated iCal file in S3 so it can be reused instead of generated every time.
	•   If overlapping dates are being imported, some sort of resolving modal notification.
	•   localStorage now gets used for storing blocked dates inside of the hostcalendar. This needs to be fixed
        by possibly making a new database table which saves the data inside of the hostcalendar. After making the
        table exporting the blocked dates from the database would be possible.


## Validating 

• Validation of the ics file use https://www.icalvalidator.com/index.html.
• Simply enter the url of the ics file, show the dates and check if the dates are being blocked correctly.