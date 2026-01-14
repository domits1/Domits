# Holidu data mapping 

## Description 
This document outlines the current status of the Holidu data mapping and is intended for future developers who will continue work on maintaining and expanding the Holidu data mapping system.

The goal of this mapping layer is to translate internal Domits property data into a Holidu-compatible format that can be consumed via Holidu’s connectivity platform. The mapping is part of the broader multi-channel distribution strategy and is expected to be reused when integrating future channels (e.g., Airbnb, Booking.com, VRBO).

## Metadata
Lambda Function: partner-listingDetails

Status: **In Development/Active**

## System context 
At the moment, Domits uses the property handler as the core function of its platform. The original plan was to expand this function to the needs of every partner we're trying to connect to, so that everything can be mapped easily. However, the idea is nice and all, but it was too simple to be the solution. 

The problem we faced was that the propery handler did not allow us to take certain information due to security risks. **Note** that the function to retrieve this info exits, just not used within the property handler. The following information is missing in the response: *street*, *housenumber*, *housenumberextentsion* and *postalcode*. 

## Workflow 
[Link](https://developer.holidu.com/docs/general-static-data) to the holidu developer page 

Looking at the [issue](https://github.com/domits1/Domits/issues/2188), it's explained how the data mapping is supposed to be done. In the current scope below u can see what paramets has been added already. 

**Our current scope**
| Domain                 | Status                            | Notes                                                   |
| ---------------------- | --------------------------------- | ------------------------------------------------------- |
| Property Static Data   | **Mapped (Not Holidu-Compliant)** | werkt in `toHoliduFull` maar types/enums niet Holidu    |
| Images                 | **Mapped (Compliant)**            | `url` + `position` werken                               |
| Descriptions           | **Mapped (Not Holidu-Compliant)** | `language` hardcoded, Holidu vereist ISO taalcodes      |
| Amenities / Facilities | **Mapped (Placeholder)**          | Fields bestaan maar inhoud niet Holidu-conform          |
| Pricing                | **Mapped (Partial)**              | alleen nightly + cleaning; geen rate plans / currencies |
| Check-in/out           | **Mapped (Compliant)**            | `checkInFrom`, `checkInTo`, `checkOutUntil` aanwezig    |
| Test flags             | **Mapped (Compliant)**            | `isTestApartment` werkt                                 |
| License                | **Mapped (Compliant)**            | direct passthrough                                      |
| Property Type          | **Mapped (Not Holidu-Compliant)** | `House` verwacht `VACATION_HOME` enums                  |
| Guest Capacity Rules   | **Mapped (Partial)**              | alleen `standardCapacity`, rest null                    |
| Address                | **Mapped (Partial)**              | `country` is naam, Holidu verwacht ISO alpha-2          |
| Availability           | ❌ **Not Implemented**             | Holidu vereist push voor availability/pricing           |
| Reservations           | ❌ **Out of Scope (Future)**       | Holidu → Domits pull                                    |
| Reviews                | ❌ **Not Relevant (Push Model)**   | Holidu reviews worden niet gepusht                      |

## Solution 

Because the property handler doesn't retrieve the location information due to privacy reasons, we will have to create a seperate API for external channels where we can give all the necessary information with it. 

Path to the function:

```
\Domits\backend\functions\PropertyHandler\business\service\propertyService.js
```
The location needs to be retrieved using the following function:

```
async getFullLocation(property) {
    return await this.propertyLocationRepository.getFullPropertyLocationById(property);
  }
```
The base of the mapping is already made by us, so this only needs to be expanded. In order to do this, there will be a refactor needed inside the database. It's the best to combine this with the [database refactor](https://github.com/domits1/Domits/issues/2446) that is going to take place on february 2026 with the other interns you are working with. **Note** that the changes that needs to be made for the data mapping for holidu is not included in this issue and still needs to be made which is proably your first step after reviewing what has been done so far by us.  

The file that has been used for data mapping is: 

```

```

# Security & Authorization (generated)
Currently **no authentication** is enforced.

**Implications / Future Requirements:**
Holidu API integration will require secure credentials
 - Expected future changes:
 - OAuth2 / token exchange, or
 - API Key / client-secret model
 - mTLS and/or signed payloads (depending on Holidu requirements)

**Open considerations:**
 - Secrets storage (AWS Parameter Store / Secrets Manager)
 - IAM policies for outbound calls
 - Rate limiting and request throttling
 - Audit logging and traceability

 ***This file needs to be updates to the partner docs for holidu once the API is succesfully fully implemented.***  