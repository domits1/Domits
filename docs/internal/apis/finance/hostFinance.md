# Stripe Account Management docs

## Description

This documentation covers all operations related to Stripe Connect for hosts.  
It includes creating and managing Stripe Express accounts (onboarding, login access, and account status), as well as retrieving all payout-related financial data.  
This includes host charges, upcoming and completed payouts, balance information, payout forecasting, and managing payout schedules (daily, weekly, monthly, or manual).

## Metadata

Lambda Functions:

- `general-crud-payment-handler` Handles creation and status retrieval of Stripe Express accounts for hosts
- `General-Payments-Production-CRUD-fetchHostPayout` Shows lists charges transferred from bookings made by guests, retrieves past and upcoming payouts (including forecast based on balance and payout schedule), returns current Stripe balance (available and pending), and allows reading and updating the host’s Stripe payout schedule (daily/weekly/monthly/manual).

Related Issue: **Main issue: [#163](https://github.com/domits1/Domits/issues/163)**

Status: **In Development/Active**

## Working Endpoints

Use https://tabletomarkdown.com/generate-markdown-table/ to simply make your own table.

| Action | Description                                                                                                         | Auth Required | Endpoint                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| POST   | Create a new Stripe Express account for the authenticated host                                                      | Yes           | https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments                              |
| GET    | Retrieve the current Stripe account status for the authenticated host                                               | Yes           | https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments                              |
| GET    | Retrieve the current Stripe balance (available and pending) for the authenticated host                              | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-balance         |
| GET    | Retrieve all charges paid out to the authenticated host (per booking)                                               | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-charges         |
| GET    | Retrieve the current Stripe payout schedule for the authenticated host                                              | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-payout-schedule |
| GET    | Retrieve payouts, including past payouts, upcoming payouts and forecasted payout amounts for the authenticated host | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-payouts         |
| POST   | Update the Stripe payout schedule (manual, daily, weekly, monthly) for the authenticated host                       | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/set-payout-schedule           |

## Security & Authorization

Authorization will use your access_token.

_How to grab your access token?_

1. Head to domits.com, acceptance.domits.com or if you're running localhost, localhost
2. Open the Dev console (CTRL+SHIFT+I)
3. Click the application tab, copy the token from **CognitoIdentityServiceProvider**.xxxxxxxxxxxxxxxx...**accessToken**
4. Copy and paste this into your request as header (If you're using Postman or any API application to invoke the request, be aware that the accessToken resets every hour.)

## Class Diagram

Show your class in a Diagram. Use [Mermaid Flow](https://mermaid.live/). Github supports mermaid chart in .md

### Example `general-crud-payment-handler`:

```mermaid
classDiagram
    class user {
        +string cognitoUserId
    }

    class stripe_account {
        +string id
        +string account_id
        +string user_id
        +number created_at
        +number updated_at
    }

    class stripe_account_status {
        +string accountId
        +string onboardingUrl
        +string loginLinkUrl
        +boolean bankDetailsProvided
        +boolean onboardingComplete
        +boolean chargesEnabled
        +boolean payoutsEnabled
    }

    user "has1" --> stripe_account
    stripe_account "has1" --> stripe_account_status
    stripe_account_status --> stripe : "built from"
```

### Example `General-Payments-Production-CRUD-fetchHostPayout`:

```mermaid
classDiagram
    class user {
        +string cognitoUserId
    }

    class stripe_account {
        +string account_id
        +string user_id
    }

    class property {
        +string id
        +string title
        +string key
    }

    class host_charge {
        +number customerPaid
        +number stripeProcessingFees
        +number platformFeeGross
        +number platformFeeNet
        +number hostReceives
        +string currency
        +string status
        +string createdDate
        +string customerName
        +string paymentMethod
        +string propertyTitle
        +string propertyImage
        +string bookingId
        +string paymentId
    }

    class host_payout {
        +string id
        +number amount
        +string currency
        +string arrivalDate
        +string status
        +string method
    }

    class upcoming_payout_group {
        +number amount
        +string currency
        +string availableOn
        +number availableOnTs
    }

    class payout_forecast {
        +string id
        +number amount
        +string currency
        +string arrivalDate
        +string status
        +string method
    }

    user "has1" --> stripe_account
    stripe_account "has many" --> host_charge
    host_charge "relates to" --> property

    stripe_account "has many" --> host_payout
    stripe_account "has many" --> upcoming_payout_group
    stripe_account "may have" --> payout_forecast
```

## Sequence Diagram

Use [Mermaid Live Editor](https://mermaid.live/) and its examples to make a Sequence Diagram for a POST request

### POST sequence diagram

```mermaid
sequenceDiagram
%% POST create Stripe connected account
    participant user
    participant index.js
    participant stripeAccountController.js
    participant stripeAccountService.js
    participant authManager.js
    participant stripeAccountRepository.js
    participant database
    participant stripe

    user->>index.js: sends POST request (Authorization header)
    index.js->>stripeAccountController.js: calls controller.create(event)
    stripeAccountController.js->>stripeAccountService.js: createStripeAccount(event)

    stripeAccountService.js->>+authManager.js: authenticateUser(Authorization token)
    authManager.js->>-stripeAccountService.js: returns { email, sub: cognitoUserId }

    stripeAccountService.js->>+stripeAccountRepository.js: getExistingStripeAccount(cognitoUserId)
    stripeAccountRepository.js->>+database: SELECT FROM Stripe_Connected_Accounts WHERE user_id = cognitoUserId
    database->>-stripeAccountRepository.js: returns stripeAccount or null
    stripeAccountRepository.js->>-stripeAccountService.js: returns stripeAccount

    %% Scenario 1: Stripe account already exists -> 409 Conflict
    stripeAccountService.js->>stripeAccountService.js: check stripeAccount?.account_id
    stripeAccountService.js->>stripeAccountController.js: throw ConflictException("Stripe account already exists")
    stripeAccountController.js->>index.js: build HTTP 409 response
    index.js->>user: returns 409, message "Stripe account already exists"

    %% Scenario 2: No existing account -> create new Stripe Express account
    stripeAccountService.js->>+stripe: accounts.create(type="express", email=userEmail)
    stripe->>-stripeAccountService.js: returns Stripe account (account.id)

    stripeAccountService.js->>+stripeAccountRepository.js: insertStripeAccount(uuid, account.id, cognitoUserId, unixNow(), unixNow())
    stripeAccountRepository.js->>+database: INSERT INTO Stripe_Connected_Accounts (...)
    database->>-stripeAccountRepository.js: insert success
    stripeAccountRepository.js->>-stripeAccountService.js: confirm insert

    stripeAccountService.js->>+stripe: accountLinks.create(accountId, refresh_url, return_url)
    stripe->>-stripeAccountService.js: returns onboarding link (link.url)

    stripeAccountService.js->>stripeAccountController.js: returns { statusCode: 202, message, details { accountId, onboardingUrl } }
    stripeAccountController.js->>index.js: build HTTP 202 response
    index.js->>user: returns 202, message + onboardingUrl (JSON body)
```

### GET sequence diagram

```mermaid
sequenceDiagram
%% GET Stripe account status - meerdere scenario's
    participant user
    participant index.js
    participant stripeAccountController.js
    participant stripeAccountService.js
    participant authManager.js
    participant stripeAccountRepository.js
    participant database
    participant stripe

    user->>index.js: sends GET request (Authorization header)
    index.js->>stripeAccountController.js: calls controller.read(event)
    stripeAccountController.js->>stripeAccountService.js: getStatusOfStripeAccount(event)

    stripeAccountService.js->>authManager.js: authenticateUser(Authorization token)
    authManager.js->>stripeAccountService.js: returns { sub: cognitoUserId }

    stripeAccountService.js->>stripeAccountRepository.js: getExistingStripeAccount(cognitoUserId)
    stripeAccountRepository.js->>database: SELECT FROM Stripe_Connected_Accounts WHERE user_id = cognitoUserId
    database->>stripeAccountRepository.js: returns stripeAccount or null
    stripeAccountRepository.js->>stripeAccountService.js: returns stripeAccount

    %% Scenario 1: No Stripe account in DB -> 404
    stripeAccountService.js->>stripeAccountService.js: check stripeAccount?.account_id
    stripeAccountService.js->>stripeAccountController.js: throw NotFoundException("No Stripe account has been found...")
    stripeAccountController.js->>index.js: build HTTP 404 response
    index.js->>user: returns 404, message "No Stripe account has been found..."

    %% Scenario 2 & 3: Stripe account exists -> retrieve status from Stripe
    stripeAccountService.js->>stripe: accounts.retrieve(account_id)
    stripe->>stripeAccountService.js: returns Stripe account details

    stripeAccountService.js->>stripeAccountService.js: set onboardingComplete, chargesEnabled, payoutsEnabled, bankDetailsProvided

    %% Scenario 2: onboarding NOT complete -> always onboarding link
    stripeAccountService.js->>stripe: accountLinks.create(accountId, refresh_url, return_url)
    stripe->>stripeAccountService.js: returns onboardingUrl
    stripeAccountService.js->>stripeAccountController.js: { statusCode: 200, message "Onboarding not complete...", details { onboardingUrl, loginLinkUrl: null, flags... } }
    stripeAccountController.js->>index.js: build HTTP 200 response
    index.js->>user: returns 200, onboardingUrl (user blijft onboarding zien)

    %% Scenario 3: onboarding complete -> login link (fallback: onboarding)
    stripeAccountService.js->>stripe: accounts.createLoginLink(accountId)
    stripe->>stripeAccountService.js: returns loginLinkUrl
    stripeAccountService.js->>stripeAccountController.js: { statusCode: 200, message "Account onboarded. Redirecting to Stripe Express Dashboard.", details { loginLinkUrl, onboardingUrl: null, flags... } }
    stripeAccountController.js->>index.js: build HTTP 200 response
    index.js->>user: returns 200, loginLinkUrl (redirect to Stripe Dashboard)

    %% (fallback binnen createLoginLinkOrOnboarding)
    stripeAccountService.js->>stripe: accountLinks.create(accountId, refresh_url, return_url) on loginLink error
    stripe->>stripeAccountService.js: returns onboardingUrl
    stripeAccountService.js->>stripeAccountController.js: { statusCode: 200, message "Onboarding not complete...", details { onboardingUrl, loginLinkUrl: null } }
```

## Todo & Improvements

Todo:

- [ ] idk
