# Booking and Reservation - Guest Payment Docs

## Description
This documentation how the payments work. For the bookings, refer to the [Booking and Reservation docs](./booking_and_reservation.md)

This also documents how the payments are being handled in the frontend. Please be aware that this specific documentation does not follow the API template, due to being a extension of the main document.

## Calculation / Logic Overview
There is no clear logic to be explained. The payment does have some logic/calculation which needs explanation.

## Flowchart

```mermaid
---
title: Booking Payment Flow
---
flowchart TD

    A["User clicks <strong>Confirm & Pay</strong>"] 
        --> B["Booking Lambda (handles booking logic)"]

    B --> C["Booking API / Database"]
    C -->|"Creates booking & returns { bookingId, clientSecret }"| D["Frontend"]

    D -->|"Creates Stripe Elements session with clientsecret"| E["Frontend: Users fills in billing information"]
	E
	E --- n1["User clicks <strong>Submit</strong>"]
	n1 --- n2["User pays on respective provider"]
	n2 ---|"Return to domits with bookingID"| n3["User gets redirected to /validatepayment"]
	n3 --- n4["Booking gets checked on paymentIntent.status"]
	n5@{ shape: "diam", label: "paymentIntent.status" }
	n4 --- n5
	n5 --- n6["succeeded"]
	n5 --- n7["processing"]
	n5 --- n8["requires_payment_method"]
	n5@{ shape: "diam", label: "paymentIntent.status (switch case)" } --- n9["default"]
	n6 ---|"Activate user booking"| n10["Booking API/Database"]
	n10 --- n11["set status paid on database with API call"]
	n11 --- n12["Frontend: User gets redirected to bookingconfirmationoverview"]
	n7 --- n13["sets message: Payment is still processing. Auto refreshes every two seconds"]
	n13 ---|"Success?"| n14["Goes to succeeded, otherwise it's required_payment_method"]
	n8 ---|"Deactivate user booking"| n15["Booking API/Database"]
	n15
	
	n15 --- n16["set status unpaid on database with API call<br>"]
	n16 --- n17["Frontend: Set message: Payment Failed. Please try another payment method. No charges have been made."]
	n9 --- n19["Something went wrong. Please contact support with error ${paymentIntent.status} (skill issue)"]
```
## Class Diagram
Show your class in a Diagram. Use [Mermaid Flow](https://mermaid.live/). Github supports mermaid chart in .md

Example:

```mermaid
classDiagram
    class property {
        +string id
    }

    class booking {
        +string id
        +number arrivaldate
        +number departuredate
        +number createdat
        +string guestid
        +number guests
        +string hostid
        +bool latepayment
        +string paymentid
        +string property_id
        +string status
        +string hostname
        +string guestname
    }

    class payment {
        +string stripepaymentid
        +string stripeclientsecret
    }

    property --> "has many" booking
    booking --> "has one" payment
```

## Sequence Diagram
Use [Mermaid Live Editor](https://mermaid.live/) and its examples to make a Sequence Diagram for a POST request

### POST sequence diagram

```mermaid
sequenceDiagram
%% POST example
    participant user
    participant index.js
    participant parseEvent.js
    participant reservationController.js
    participant bookingService.js
    participant authManager.js
    participant reservationRepository.js
    participant propertyRepository.js
    participant getHostEmailById.js
    participant sendEmail.js
    participant paymentService.js
    participant stripeRepository.js

    user->>index.js: sends API request
    index.js->>+parseEvent.js: parses event based on requestbody/queryparams
    parseEvent.js->>-index.js: returns requestbody (in this scenario)
    index.js->>reservationController.js: sends parsedevent
    reservationController.js->>bookingService.js: send info needed for booking
    bookingService.js->>+authManager.js: ensure user has a valid auth token
    authManager.js->>-bookingService.js: Return user's information
    bookingService.js->>+propertyRepository.js: Get property details (send property_id)
    propertyRepository.js->>-bookingService.js: Return property details
    bookingService.js->>+getHostEmailById.js: Get host email from property details getHostEmailById
    getHostEmailById.js->>-bookingService.js: Returns host email
    bookingService.js->>sendEmail.js: Send email to Guest and Host with Bookingdetails
    bookingService.js->>reservationRepository.js: Send booking in database
    reservationRepository.js->>reservationController.js: Return 201 and bookingdetails for payment information
    reservationController.js->>paymentService.js: Send bookingdetails for payment to the paymentService
    paymentService.js->>+stripeRepository.js: Gets stripe accountid (db query)
    stripeRepository.js->>-paymentService.js: Returns stripe accountid
    paymentService.js->>+stripeRepository.js: Create a payment intent with bookingdetails
    stripeRepository.js->>-paymentService.js: Retrieve paymentintent
    paymentService.js->>stripeRepository.js: Update payment id to proper paymentid from intent
    paymentService.js->>+stripeRepository.js: Add paymentdata to database table payment
    stripeRepository.js->>-user: Returns 201, paymentdata + clientsecret/intent and bookingid
```

## Request Examples

### POST 
Endpoint: https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings
```json
{
  "httpMethod": "POST",
  "headers": {
    "Authorization": "ADDYOUROWNTOKENHERE()"
  },
  "body": {
    "identifiers": {
      "property_Id": "c759a4b7-8dcf-4544-a6cf-8df7edf3a7e8"
    },
    "general": {
      "guests": 2,
      "arrivalDate": 1744934400000,
      "departureDate": 1745020800000
    }
  }
}

```
### GET

| `readType`  | Description                                       | Auth | Example                                                               |
| ----------- | ------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| `guest`     | Fetch all bookings of a guest                     | ✅    | `/bookings?readType=guest`                                            |
| `hostId`    | Fetch all bookings for properties owned by a host | ✅    | `/bookings?readType=hostId`                                           |
| `createdAt` | Get bookings created after a created at date         | ❌    | `/bookings?readType=createdAt&property_Id=<id>&createdAt=<timestamp>` |
| `paymentId` | Get booking via Stripe payment ID                 | ✅    | `/bookings?readType=paymentId&paymentID=pi_3S5nsgGiInrsWMEc0djWC2YZ`  |
| `departureDate` | Get bookings from a departureDate | ❌ | `/bookings?readType=departureDate&property_Id=c759a4b7-8dcf-4544-a6cf-8df7edf3a7e8&departureDate=1749513600000` |

## Todo & Improvements
Todo:
- [ ] Add GET requests as sequence diagram
- [ ] Finish the rest of the documentation