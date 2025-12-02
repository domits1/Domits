# Stripe Account Management docs

## Description

This documentation describes the operations related to creating and managing Stripe Express accounts for hosts. It covers account creation, onboarding, login link generation, and retrieving the status of a host’s Stripe account.  

## Metadata

Lambda Function: `general-crud-payment-handler`

Related Issue: **Main issue: [#163](https://github.com/domits1/Domits/issues/163)**

Status: **In Development/Active**

## Working Endpoints

Use https://tabletomarkdown.com/generate-markdown-table/ to simply make your own table.

| Action | Description                                                           | Auth Required | Endpoint                                                                     |
| ------ | --------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| POST   | Create a new Stripe Express account for the authenticated user        | Yes           | https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments |
| GET    | Retrieve the current Stripe account status for the authenticated user | Yes           | https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments |

## Security & Authorization

Authorization will use your access_token.

_How to grab your access token?_

1. Head to domits.com, acceptance.domits.com or if you're running localhost, localhost
2. Open the Dev console (CTRL+SHIFT+I)
3. Click the application tab, copy the token from **CognitoIdentityServiceProvider**.xxxxxxxxxxxxxxxx...**accessToken**
4. Copy and paste this into your request as header (If you're using Postman or any API application to invoke the request, be aware that the accessToken resets every hour.)

## Class Diagram

Show your class in a Diagram. Use [Mermaid Flow](https://mermaid.live/). Github supports mermaid chart in .md

Example:

```mermaid
classDiagram
    class user {
        +string cognitoUserId
    }

    class stripe_account {
        +string id
        +string account_id
        +string created_at
        +string updated_at
        +string user_id
    }

    user "has1" --> stripe_account
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

## Todo & Improvements

Todo:

- [ ] Add GET requests as sequence diagram
- [ ] Finish the rest of the documentation
