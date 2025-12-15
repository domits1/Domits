# Distribution docs 

## Description
This API is the public partner-facing endpoint used by external distribution partners (e.g., Booking.com, Holidu) to retrieve full listing details for a property.

## Metadata
Lambda Function: partner-listingDetails

Status: **In Development/Active**

## Working Ednpoints
Use https://tabletomarkdown.com/generate-markdown-table/ to simply make your own table.


| Action | Description                                  | Auth Required | Endpoint                                           |
| ------ | -------------------------------------------- | ------------- | -------------------------------------------------- |
| GET    | Retrieve full listing details for a property | No (for now)  | `/v1/partner/listingDetails?property=<propertyId>` |

## Base URL 
```
https://0osjy8rcf7.execute-api.eu-north-1.amazonaws.com/default
```

## Security & Authorization

Currently **no authentication** is enforced.

Recommended next steps before onboarding external partners:
* Add API Key requirement (per partner) and usage plans (rate limiting).
* Optionally add HMAC request signing (shared secret) for stronger partner authentication.
* Enforce HTTPS only (default on API Gateway) and enable structured access logging.

## Calculation / Logic Overview

High-level flow:
1. Partner calls GET /v1/partner/listingDetails with query parameter property (UUID).
2. Lambda validates the query parameter.
3. Lambda calls the internal listing service:
    * Internal base: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default

    * Internal endpoint: /property/bookingEngine/listingDetails?property=<propertyId>
4. Lambda returns the internal service response as JSON (currently 1:1 passthrough).
5. Errors are returned with correct HTTP status codes (400, internal status, 500).

**Notes:** 
* Accepted query parameters: property (preferred), propertyId (supported alias).
* Response schema is currently the internal schema; later it can be mapped to a partner-specific contract without changing the internal service.

## Request Examples 

### GET 
***Example URL:***
```
/v1/partner/listingDetails?property=3bdf949f-d58a-488e-8150-8bae30c46fee
```

### cURL

```
curl -X GET "https://0osjy8rcf7.execute-api.eu-north-1.amazonaws.com/default/v1/partner/listingDetails?property=3bdf949f-d58a-488e-8150-8bae30c46fee"
```

### Lambda Proxy Event Example (what Lambda receives)
```
{
  "resource": "/v1/partner/listingDetails",
  "path": "/v1/partner/listingDetails",
  "httpMethod": "GET",
  "queryStringParameters": {
    "property": "3bdf949f-d58a-488e-8150-8bae30c46fee"
  }
}
```
## Response examples 

### 200 OK (truncated)
```
{
    "property": {
        "id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
        "hostId": "0f5cc159-c8b2-48f3-bf75-114a10a1d6b3",
        "title": "De Deken – Charming Accommodation with Garden Access in Best",
        "subtitle": "best, netherlands",
        "description": "With garden views, De Deken in Best provides accommodations and a garden. Free WiFi and on-site parking are available. Outdoor seating is also offered.\n\nEach unit features a seating area, a dining area, and a fully equipped kitchen with an oven, microwave, fridge, and stovetop. Kitchenware and a coffee machine are also provided. All units share a bathroom and include bed linen.",
        "registrationNumber": "9876543456",
        "status": "ACTIVE",
        "createdAt": 1762439203035,
        "updatedAt": 0,
        "username": "Domits Demo Account ",
        "familyname": "Raman"
    },
    "amenities": [
        {
            "id": "218344ca-0a43-471f-b322-dd030c71471d",
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "amenityId": "10"
        },
        {
            "id": "2b0cdff3-ab27-45b0-b329-d7c33451c48f",
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "amenityId": "84"
        }
    ],
    "availability": [
        {
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "availableStartDate": 1762525601075,
            "availableEndDate": 1765031201075
        }
    ],
    "availabilityRestrictions": [
        {
            "id": "ddb34851-cce3-48e5-9e08-89dc153cd0f9",
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "restriction": "MaximumNightsPerYear",
            "value": 30
        }
    ],
    "checkIn": {
        "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
        "checkIn": {
            "from": "16:00:00",
            "till": "16:00:00"
        },
        "checkOut": {
            "from": "20:00:00",
            "till": "20:00:00"
        }
    },
    "generalDetails": [
        {
            "id": "0ec8f26e-f5c6-4d86-9f74-ce0499bb354a",
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "detail": "Bedrooms",
            "value": 2
        },
        {
            "id": "57013c72-83f5-446b-909c-92c3d31aee56",
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "detail": "Beds",
            "value": 3
        }
    ],
    "images": [
        {
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "key": "images/3bdf949f-d58a-488e-8150-8bae30c46fee/39fd3142-e040-437b-9c67-82f96dd0e942"
        },
        {
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "key": "images/3bdf949f-d58a-488e-8150-8bae30c46fee/592a5e48-c70e-45ad-a92a-cc96c4d7b529"
        }
    ],
    "location": {
        "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
        "country": "Netherlands",
        "city": "best"
    },
    "pricing": {
        "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
        "roomRate": 243,
        "cleaning": 0
    },
    "rules": [
        {
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "rule": "PetsAllowed",
            "value": true
        },
        {
            "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
            "rule": "SmokingAllowed",
            "value": false
        }
    ],
    "propertyType": {
        "property_id": "3bdf949f-d58a-488e-8150-8bae30c46fee",
        "property_type": "House",
        "spaceType": "Full house"
    },
    "technicalDetails": null
}
```
### 400 Bad resquest
```
{
  "error": "Missing required query parameter: ?propertyId=<propertyId>"
}
```

### 500 Internal server error (unexpected)
```
{
  "error": "Unexpected server error"
}
```

## Todo & improvements
* Add more features (e.g. rates)
* Mapping needs to be done for partners (e.g. Holidu and booking.com)