# TEST Mode Implementation - AWS Isolation

## Overview

This document describes the TEST mode implementation that allows unit and end-to-end tests to run locally **without AWS credentials**.

## Strategy

All AWS-dependent components check `process.env.TEST === "true"` and:
- **TEST mode**: Return mock data/objects without calling AWS services
- **PROD mode**: Use real AWS services as before

## Files Modified

### 1. `parseEvent.js` - Fixed Critical Bugs
**Path:** `backend/functions/General-Bookings-CRUD-Bookings-develop/business/parseEvent.js`

**Changes:**
- Fixed undefined `authToken` variable (was using `authHeader` but referencing `authToken`)
- Added null checks for `event.headers` before accessing `Authorization`
- Added null checks for `event.body` before JSON.parse
- Added null checks for `event.queryStringParameters`
- Improved error handling for malformed JSON

**Impact:** Tests no longer crash on missing headers/body.

---

### 2. `cognitoRepository.js` - TEST Mode Mock
**Path:** `backend/functions/General-Bookings-CRUD-Bookings-develop/data/cognitoRepository.js`

**Changes:**
- Constructor checks `process.env.TEST === "true"`
- TEST mode: Returns mock user data without calling AWS Cognito
- PROD mode: Uses real CognitoIdentityProviderClient

**Mock User Data:**
```javascript
{
  UserAttributes: [
    { Name: "sub", Value: "test-user-sub-123" },
    { Name: "email", Value: "test@example.com" },
    { Name: "email_verified", Value: "true" },
  ],
  Username: "test-user",
}
```

**Impact:** No AWS Cognito calls during tests.

---

### 3. `ORM/index.js` - Database Mock
**Path:** `backend/ORM/index.js`

**Changes:**
- `_getInstanceInternal()` checks `process.env.TEST === "true"`
- TEST mode: Returns mock DataSource with transaction support
- Mock DataSource provides:
  - `transaction()` method that executes callback with mock manager
  - Mock query builder chain for overlap checks
  - Mock insert/update operations
- `initializeDatabase()` skips AWS DSQL signer in TEST mode

**Impact:** No AWS RDS/DSQL signer calls during tests.

---

### 4. `systemManagerRepository.js` - Already Fixed
**Path:** `backend/functions/General-Bookings-CRUD-Bookings-develop/data/systemManagerRepository.js`
**Path:** `backend/ORM/data/systemManagerRepository.js`

**Changes:** (Already implemented in previous changes)
- TEST mode: Returns `"test-value"` without calling AWS SSM
- PROD mode: Uses real SSM client

**Impact:** No AWS SSM calls during tests.

---

### 5. `stripeRepository.js` - Stripe Mock
**Path:** `backend/functions/General-Bookings-CRUD-Bookings-develop/data/stripeRepository.js`

**Changes:**
- `stripePromise` initialization checks `process.env.TEST === "true"`
- TEST mode: Returns mock Stripe object with mock `paymentIntents.create()` and `retrieve()`
- `getStripeAccountId()` returns `"acct_test_123"` in TEST mode
- DynamoDB client initialization skipped in TEST mode

**Mock Stripe Response:**
```javascript
{
  id: "pi_test_123",
  client_secret: "pi_test_123_secret_test",
  status: "succeeded"
}
```

**Impact:** No Stripe API calls during tests.

---

### 6. `getHostAuthToken.js` - Already Fixed
**Path:** `backend/test/util/getHostAuthToken.js`

**Changes:** (Already implemented in previous changes)
- TEST mode: Returns `"dummy-host-token"` without calling Cognito
- PROD mode: Uses real Cognito client

**Impact:** Test helpers don't require AWS credentials.

---

## Test Execution

### Unit Tests
```bash
cd backend
cross-env TEST=true npm test -- General-Bookings-CRUD-Bookings-develop
```

### End-to-End Tests
```bash
cd backend
cross-env TEST=true npm test -- General-Bookings-CRUD-Bookings-develop/end-to-end
```

**Note:** `cross-env` is already configured in `package.json` scripts, so `TEST=true` is automatically set.

---

## Separation of Concerns

### TEST Mode (`process.env.TEST === "true"`)
- ✅ No AWS SDK calls
- ✅ No real database connections
- ✅ No external API calls (Cognito, Stripe, SSM)
- ✅ Mock data returned for all dependencies
- ✅ Tests run fully isolated

### PROD Mode (`process.env.TEST !== "true"`)
- ✅ Real AWS services used
- ✅ Real database connections via DSQL signer
- ✅ Real Cognito authentication
- ✅ Real Stripe API calls
- ✅ Real SSM parameter retrieval

---

## Business Logic Unchanged

**Important:** All business logic remains **completely unchanged**. Only the following layers were modified:
- ✅ Auth layer (CognitoRepository)
- ✅ Repository layer (Database, StripeRepository)
- ✅ Test setup (parseEvent safety guards)
- ✅ Infrastructure layer (SystemManagerRepository)

**No changes to:**
- ❌ BookingService business logic
- ❌ ReservationController logic
- ❌ PaymentService logic
- ❌ Data models
- ❌ API contracts

---

## Verification Checklist

- [x] parseEvent handles missing headers/body safely
- [x] CognitoRepository mocks user data in TEST mode
- [x] Database returns mock DataSource in TEST mode
- [x] StripeRepository mocks payment intents in TEST mode
- [x] SystemManagerRepository returns test values in TEST mode
- [x] getHostAuthToken returns dummy token in TEST mode
- [x] All unit tests pass without AWS credentials
- [x] All end-to-end tests pass without AWS credentials

---

## Future Improvements

1. **In-Memory Database for E2E Tests:** Consider using SQLite or in-memory PostgreSQL for more realistic E2E tests
2. **Stripe Test Mode:** Use Stripe's test mode API keys instead of full mock (optional)
3. **Test Fixtures:** Add test fixtures for consistent test data

---

## Troubleshooting

**Issue:** Tests still fail with AWS credential errors
**Solution:** Ensure `TEST=true` is set in environment. Check `package.json` scripts use `cross-env TEST=true`.

**Issue:** parseEvent still crashes
**Solution:** Verify the updated parseEvent.js is being used (check file has null checks).

**Issue:** Database still tries to connect
**Solution:** Verify `ORM/index.js` has TEST mode check in `_getInstanceInternal()`.
