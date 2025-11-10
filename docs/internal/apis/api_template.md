# API Template

## Description
Short summary (2-3 sentences) about what this API does and why it exists

## Metadata
Lambda Function: ...

Related Issue: ...

Status: **In Development** (Active | Deprecated | In Development)

## Working Endpoints
Use https://tabletomarkdown.com/generate-markdown-table/ to simply make your own table.

| Action | Description          | Auth Required                   | Endpoint |
| ------ | -------------------- | ------------------------------- | -------- |
| POST   | Create new resource  | Yes                             | /create  |
| GET    | Retrieve resource(s) | Depends on Endpoint             | /read    |
| PATCH  | Update resource      | Yes                             | /update  |
| DELETE | Remove resource      | Yes (author must match user_id) | /delete  |


## Security & Authorization
Add a section here how you implement security & auth

## Calculation / Logic Overview
If applicable only. Describe key logic like calculations, flows or triggers

## Class Diagram
Show your class in a Diagram. Use [Mermaid Flow](https://mermaid.live/). Github supports mermaid chart in .md

Example:

```mermaid
    classDiagram
    class user {
        +string id
    }

    class property {
        +string id
        +string hostId
        +string title
        +string subtitle
        +string description
        +number guestCapacity
        +number registrationNumber
        +boolean status
        +number createdAt
        +number updatedAt
    }

    class property_location {
        +string property_id
        +string country
        +string city
        +string street
        +string postalCode
    }

    class property_image {
        +string property_id
        +string key
    }

    class property_pricing {
        +string property_id
        +number roomRate
        +number cleaning
        +number service
    }

    class property_general_detail {
        +string property_id
        +string detail
        +number value
    }

    class property_general_details {
        +string detail
    }

    class property_rule {
        +string property_id
        +string rule
        +boolean value
    }

    class property_rules {
        +string rule
    }

    class property_check_in {
        +string property_id
        +map checkIn
        +map checkOut
    }

    class property_availability {
        +string property_id
        +number availableStartDate
        +number availableEndDate
    }

    class property_availability_restriction {
        +string property_id
        +string restriction
        +number value
    }

    class property_availability_restrictions {
        +string restriction
    }

    class property_amenity {
        +string id
        +string property_id
        +string amenityId
    }

    class property_amenity_and_category {
        +string id
        +string category
        +string amenity
    }

    class property_amenities {
        +string amenity
    }

    class property_amenity_categories {
        +string category
    }

    class property_type_keys {
        +string type
    }

    class property_property_type {
        +string property_id
        +string property_type
        +string spaceType
    }

    class property_technical_details {
        +string property_id
        +number length
        +number height
        +number fuelConsumption
        +number speed
        +number renovationYear
        +string transmission
        +number generalPeriodicInspection
        +boolean fourWheelDrive
    }

    user "has many" --> property
    property --> "has1" property_technical_details
    property --> "has1" property_location
    property --> "has1" property_pricing
    property --> "has1" property_check_in
    property --> "has1" property_property_type
    property_property_type --> "has1" property_type_keys
    property --> "has many" property_image
    property --> "has many" property_general_detail
    property_general_detail --> "has1" property_general_details
    property --> "has many" property_rule
    property_rule --> "has1" property_rules
    property --> "has many" property_availability
    property --> "has many" property_availability_restriction
    property_availability_restriction --> "has1" property_availability_restrictions
    property --> "has many" property_amenity
    property_amenity --> "has1" property_amenity_and_category
    property_amenity_and_category --> "has1" property_amenities
    property_amenity_and_category --> "has1" property_amenity_categories
```

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
    "Authorization": "example"
  },
  "body": {
    "identifiers": {
      "property_Id": "606519ba-89a4-4e52-a940-3e4f79dabdd7"
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
Use https://tabletomarkdown.com/generate-markdown-table/ to simply make your own table.

| `readType`  | Description                                       | Auth | Example                                                               |
| ----------- | ------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| `guest`     | Fetch all bookings of a guest                     | ✅    | `/bookings?readType=guest`                                            |
| `hostId`    | Fetch all bookings for properties owned by a host | ✅    | `/bookings?readType=hostId`                                           |
| `createdAt` | Get bookings created after a certain date         | ❌    | `/bookings?readType=createdAt&property_Id=<id>&createdAt=<timestamp>` |
| `paymentId` | Get booking via Stripe payment ID                 | ✅    | `/bookings?readType=paymentId&paymentID=pi_3S5nsgGiInrsWMEc0djWC2YZ`  |

## Todo & Improvements
A general overview for things you yet have to do or improvements to add.