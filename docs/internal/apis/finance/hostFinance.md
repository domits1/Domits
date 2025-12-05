# Host finance (Stripe Account Management) docs

## Description

This documentation covers all operations related to Stripe Connect for hosts.  
It includes creating and managing Stripe Express accounts (onboarding, login access, and account status), as well as retrieving all payout-related financial data.  
This includes host charges, upcoming and completed payouts, balance information, payout forecasting, and managing payout schedules (daily, weekly, monthly).

## Metadata

Lambda Functions:

- `general-crud-payment-handler` Handles creation and status retrieval of Stripe Express accounts for hosts
- `General-Payments-Production-CRUD-fetchHostPayout` Shows lists charges transferred from bookings made by guests, retrieves past and upcoming payouts (including forecast based on balance and payout schedule), returns current Stripe balance (available and pending), and allows reading and updating the host’s Stripe payout schedule (daily/weekly/monthly/manual).

Related Issue: **Main issue: [#163](https://github.com/domits1/Domits/issues/163)**

Status: **In Development/Active**

## Working Endpoints

Use https://tabletomarkdown.com/generate-markdown-table/ to simply make your own table.

| Lambda function                                    | Action | Description                                                                                                         | Auth Required | Endpoint                                                                                                  |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `general-crud-payment-handler`                     | POST   | Create a new Stripe Express account for the authenticated host                                                      | Yes           | https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments                              |
| `general-crud-payment-handler`                     | GET    | Retrieve the current Stripe account status for the authenticated host                                               | Yes           | https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments                              |
| `General-Payments-Production-CRUD-fetchHostPayout` | GET    | Retrieve the current Stripe balance (available and pending) for the authenticated host                              | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-balance         |
| `General-Payments-Production-CRUD-fetchHostPayout` | GET    | Retrieve all charges paid out to the authenticated host (per booking)                                               | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-charges         |
| `General-Payments-Production-CRUD-fetchHostPayout` | GET    | Retrieve the current Stripe payout schedule for the authenticated host                                              | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-payout-schedule |
| `General-Payments-Production-CRUD-fetchHostPayout` | GET    | Retrieve payouts, including past payouts, upcoming payouts and forecasted payout amounts for the authenticated host | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-payouts         |
| `General-Payments-Production-CRUD-fetchHostPayout` | POST   | Update the Stripe payout schedule (manual, daily, weekly, monthly) for the authenticated host                       | Yes           | https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/set-payout-schedule           |

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

### POST sequence diagram (`general-crud-payment-handler`)

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

### GET sequence diagram (`general-crud-payment-handler` )

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

<hr>

### GET sequence diagram (`retrieve-user-charges` → `General-Payments-Production-CRUD-fetchHostPayout`)

```marmaid
sequenceDiagram
    %% GET host charges (transfers to connected account)
    participant user
    participant index.js
    participant stripePayoutsController.js
    participant stripePayoutsService.js
    participant authManager.js
    participant stripeAccountRepository.js
    participant database
    participant propertyRepository.js
    participant stripe

    user->>index.js: sends GET /payments/retrieve-user-charges (Authorization header)
    index.js->>stripePayoutsController.js: controller.getHostCharges(event)
    stripePayoutsController.js->>stripePayoutsService.js: getHostCharges(event)

    stripePayoutsService.js->>authManager.js: authenticateUser(Authorization token)
    authManager.js->>stripePayoutsService.js: { sub: cognitoUserId }

    stripePayoutsService.js->>stripeAccountRepository.js: getExistingStripeAccount(cognitoUserId)
    stripeAccountRepository.js->>database: SELECT * FROM Stripe_Connected_Accounts WHERE user_id = cognitoUserId
    database->>stripeAccountRepository.js: stripeAccount or null
    stripeAccountRepository.js->>stripePayoutsService.js: stripeAccount

    %% Scenario: no Stripe account
    stripePayoutsService.js->>stripePayoutsController.js: throw NotFoundException("No Stripe account found for this user.")
    stripePayoutsController.js->>index.js: build HTTP 404 response
    index.js->>user: 404 Not Found

    %% Scenario: Stripe account exists -> load transfers
    stripePayoutsService.js->>stripe: transfers.list({ destination: account_id, expand: [...] })
    stripe->>stripePayoutsService.js: transfers[]

    %% For each transfer: compute financials + load property
    stripePayoutsService.js->>propertyRepository.js: getProperty(propertyId from charge.metadata)
    propertyRepository.js->>database: SELECT title, key FROM Property LEFT JOIN Property_Image ...
    database->>propertyRepository.js: { title, key }
    propertyRepository.js->>stripePayoutsService.js: property

    stripePayoutsService.js->>stripePayoutsController.js: { statusCode: 200, details: { charges: [...] } }
    stripePayoutsController.js->>index.js: build HTTP 200 response
    index.js->>user: 200 OK (charges list)
```
### GET sequence diagram (`retrieve-user-payouts` → `General-Payments-Production-CRUD-fetchHostPayout`)
```mermaid
sequenceDiagram
    %% GET host payouts (past, upcoming, forecast)
    participant user
    participant index.js
    participant stripePayoutsController.js
    participant stripePayoutsService.js
    participant authManager.js
    participant stripeAccountRepository.js
    participant database
    participant stripe

    user->>index.js: sends GET /payments/retrieve-user-payouts (Authorization header)
    index.js->>stripePayoutsController.js: controller.getHostPayouts(event)
    stripePayoutsController.js->>stripePayoutsService.js: getHostPayouts(event)

    stripePayoutsService.js->>authManager.js: authenticateUser(Authorization token)
    authManager.js->>stripePayoutsService.js: { sub: cognitoUserId }

    stripePayoutsService.js->>stripeAccountRepository.js: getExistingStripeAccount(cognitoUserId)
    stripeAccountRepository.js->>database: SELECT * FROM Stripe_Connected_Accounts WHERE user_id = cognitoUserId
    database->>stripeAccountRepository.js: stripeAccount or null
    stripeAccountRepository.js->>stripePayoutsService.js: stripeAccount

    %% Scenario: no Stripe account
    stripePayoutsService.js->>stripePayoutsController.js: throw NotFoundException("No Stripe account found for this user.")
    stripePayoutsController.js->>index.js: build HTTP 404 response
    index.js->>user: 404 Not Found

    %% Scenario: Stripe account exists -> Stripe payouts
    stripePayoutsService.js->>stripe: payouts.list({ stripeAccount: account_id })
    stripe->>stripePayoutsService.js: payouts[]

    stripePayoutsService.js->>stripePayoutsService.js: map & sort payouts into payoutDetails[]

    %% Load upcoming pending amounts via getHostPendingAmount
    stripePayoutsService.js->>stripePayoutsService.js: getHostPendingAmount(event)
    stripePayoutsService.js->>stripe: balanceTransactions.list({ available_on >= now }, { stripeAccount })
    stripe->>stripePayoutsService.js: balanceTransactions[]
    stripePayoutsService.js->>stripePayoutsService.js: group into upcomingByDate[]

    %% Load forecast payout via getForecastFromBalance
    stripePayoutsService.js->>stripePayoutsService.js: getForecastFromBalance(event)
    stripePayoutsService.js->>stripe: accounts.retrieve(account_id)
    stripe->>stripePayoutsService.js: account (payouts.schedule)

    stripePayoutsService.js->>stripe: balance.retrieve({}, { stripeAccount })
    stripe->>stripePayoutsService.js: balance (available/pending)

    stripePayoutsService.js->>stripe: balanceTransactions.list({ available_on between now and cutoffTs }, { stripeAccount })
    stripe->>stripePayoutsService.js: pendingTxns[]
    stripePayoutsService.js->>stripePayoutsService.js: compute forecast + cutoffTs

    %% Merge forecast + upcoming pending + historical payouts
    stripePayoutsService.js->>stripePayoutsService.js: merge forecast, upcomingByDate, payoutDetails into payouts[]

    stripePayoutsService.js->>stripePayoutsController.js: { statusCode: 200, details: { payouts } }
    stripePayoutsController.js->>index.js: build HTTP 200 response
    index.js->>user: 200 OK (payouts list)
```

### GET sequence diagram (`retrieve-user-balance` → `General-Payments-Production-CRUD-fetchHostPayout`)
```mermaid
sequenceDiagram
    %% GET host balance (available & pending)
    participant user
    participant index.js
    participant stripePayoutsController.js
    participant stripePayoutsService.js
    participant authManager.js
    participant stripeAccountRepository.js
    participant database
    participant stripe

    user->>index.js: sends GET /payments/retrieve-user-balance (Authorization header)
    index.js->>stripePayoutsController.js: controller.getHostBalance(event)
    stripePayoutsController.js->>stripePayoutsService.js: getHostBalance(event)

    stripePayoutsService.js->>authManager.js: authenticateUser(Authorization token)
    authManager.js->>stripePayoutsService.js: { sub: cognitoUserId }

    stripePayoutsService.js->>stripeAccountRepository.js: getExistingStripeAccount(cognitoUserId)
    stripeAccountRepository.js->>database: SELECT * FROM Stripe_Connected_Accounts WHERE user_id = cognitoUserId
    database->>stripeAccountRepository.js: stripeAccount or null
    stripeAccountRepository.js->>stripePayoutsService.js: stripeAccount

    %% Scenario: no Stripe account
    stripePayoutsService.js->>stripePayoutsController.js: throw NotFoundException("No Stripe account found for this user.")
    stripePayoutsController.js->>index.js: build HTTP 404 response
    index.js->>user: 404 Not Found

    %% Scenario: Stripe account exists -> Stripe balance
    stripePayoutsService.js->>stripe: balance.retrieve({}, { stripeAccount: account_id })
    stripe->>stripePayoutsService.js: balance (available[], pending[])

    stripePayoutsService.js->>stripePayoutsService.js: map available & pending to amounts (cents -> amount)

    stripePayoutsService.js->>stripePayoutsController.js: { statusCode: 200, details: { available, pending } }
    stripePayoutsController.js->>index.js: build HTTP 200 response
    index.js->>user: 200 OK (available & pending)
```

### POST sequence diagram (`set-payout-schedule` → `General-Payments-Production-CRUD-fetchHostPayout`)
```mermaid
sequenceDiagram
    %% POST set payout schedule (manual/daily/weekly/monthly)
    participant user
    participant index.js
    participant stripePayoutsController.js
    participant stripePayoutsService.js
    participant authManager.js
    participant stripeAccountRepository.js
    participant database
    participant stripe

    user->>index.js: sends POST /payments/set-payout-schedule (Authorization + body)
    index.js->>stripePayoutsController.js: controller.setPayoutSchedule(event)
    stripePayoutsController.js->>stripePayoutsService.js: setPayoutSchedule(event)

    stripePayoutsService.js->>authManager.js: authenticateUser(Authorization token)
    authManager.js->>stripePayoutsService.js: { sub: cognitoUserId }

    stripePayoutsService.js->>stripeAccountRepository.js: getExistingStripeAccount(cognitoUserId)
    stripeAccountRepository.js->>database: SELECT * FROM Stripe_Connected_Accounts WHERE user_id = cognitoUserId
    database->>stripeAccountRepository.js: stripeAccount or null
    stripeAccountRepository.js->>stripePayoutsService.js: stripeAccount

    %% Scenario: no Stripe account
    stripePayoutsService.js->>stripePayoutsController.js: throw NotFoundException("No Stripe account found for this user.")
    stripePayoutsController.js->>index.js: build HTTP 404 response
    index.js->>user: 404 Not Found

    %% Parse & validate body
    stripePayoutsService.js->>stripePayoutsService.js: parse JSON body (interval, weekly_anchor, monthly_anchor)
    stripePayoutsService.js->>stripePayoutsService.js: validate interval in [manual,daily,weekly,monthly]

    %% Scenario: interval = manual -> require positive available balance
    stripePayoutsService.js->>stripePayoutsService.js: getHostBalance(event)
    stripePayoutsService.js->>stripe: balance.retrieve({}, { stripeAccount })
    stripe->>stripePayoutsService.js: balance
    stripePayoutsService.js->>stripePayoutsService.js: sum available amounts
    stripePayoutsService.js->>stripePayoutsController.js: throw BadRequestException if totalAvailableCents <= 0

    %% Scenario: interval = weekly -> validate weekly_anchor
    stripePayoutsService.js->>stripePayoutsService.js: check weekly_anchor ∈ [monday..sunday]

    %% Scenario: interval = monthly -> validate monthly_anchor (1..31)
    stripePayoutsService.js->>stripePayoutsService.js: check monthly_anchor between 1 and 31

    %% Update schedule in Stripe
    stripePayoutsService.js->>stripe: accounts.update(account_id, { settings: { payouts: { schedule } } })
    stripe->>stripePayoutsService.js: updated account (with schedule)

    stripePayoutsService.js->>stripePayoutsController.js: { statusCode: 200, message, details { accountId, interval, weekly_anchor, monthly_anchor } }
    stripePayoutsController.js->>index.js: build HTTP 200 response
    index.js->>user: 200 OK (schedule updated)
```

### GET sequence diagram (`retrieve-user-payout-schedule` → `General-Payments-Production-CRUD-fetchHostPayout`)
```mermaid
sequenceDiagram
    %% GET payout schedule
    participant user
    participant index.js
    participant stripePayoutsController.js
    participant stripePayoutsService.js
    participant authManager.js
    participant stripeAccountRepository.js
    participant database
    participant stripe

    user->>index.js: sends GET /payments/retrieve-user-payout-schedule (Authorization header)
    index.js->>stripePayoutsController.js: controller.getPayoutSchedule(event)
    stripePayoutsController.js->>stripePayoutsService.js: getPayoutSchedule(event)

    stripePayoutsService.js->>authManager.js: authenticateUser(Authorization token)
    authManager.js->>stripePayoutsService.js: { sub: cognitoUserId }

    stripePayoutsService.js->>stripeAccountRepository.js: getExistingStripeAccount(cognitoUserId)
    stripeAccountRepository.js->>database: SELECT * FROM Stripe_Connected_Accounts WHERE user_id = cognitoUserId
    database->>stripeAccountRepository.js: stripeAccount or null
    stripeAccountRepository.js->>stripePayoutsService.js: stripeAccount

    %% Scenario: no Stripe account
    stripePayoutsService.js->>stripePayoutsController.js: throw NotFoundException("No Stripe account found for this user.")
    stripePayoutsController.js->>index.js: build HTTP 404 response
    index.js->>user: 404 Not Found

    %% Scenario: Stripe account exists -> read payout schedule
    stripePayoutsService.js->>stripe: accounts.retrieve(account_id)
    stripe->>stripePayoutsService.js: account (settings.payouts.schedule)

    stripePayoutsService.js->>stripePayoutsController.js: { statusCode: 200, details { accountId, interval, weekly_anchor, monthly_anchor } }
    stripePayoutsController.js->>index.js: build HTTP 200 response
    index.js->>user: 200 OK (payout schedule)
```

## Todo & Improvements

Todo:

- [ ] Make it more clearer for future devs and ask feedback to current devs if this is clear enough
