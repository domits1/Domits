import {randomUUID} from "node:crypto";
import {image} from "./approvedImage.js";

export function getPropertyObject() {
    const propertyId = randomUUID();
    const amenityRecordId = randomUUID();
    const availabilityRestrictionId = randomUUID();
    const generalDetailId = randomUUID();

    return {
        "property": {
            "id": propertyId,
            "hostId": "1",
            "title": "test",
            "subtitle": "test",
            "description": "test",
            "guestCapacity": 1,
            "registrationNumber": randomUUID(),
            "status": "ACTIVE",
            "createdAt": 1,
            "updatedAt": 1
        },
        "propertyAmenities": [
            {
                "id": amenityRecordId,
                "property_id": propertyId,
                "amenityId": "1"
            }
        ],
        "propertyAvailability": [
            {
                "property_id": propertyId,
                "availableStartDate": Date.now() + 60 * 60 * 1000,
                "availableEndDate": Date.now() + 60 * 60 * 1000 * 2
            }
        ],
        "propertyAvailabilityRestrictions": [
            {
                "id": availabilityRestrictionId,
                "property_id": propertyId,
                "restriction": "MaximumStay",
                "value": 1
            }
        ],
        "propertyCheckIn": {
            "property_id": propertyId,
            "checkIn": {
                "from": "10:00",
                "till": "17:00"
            },
            "checkOut": {
                "from": "08:00",
                "till": "12:00"
            }
        },
        "propertyGeneralDetails": [
            {
                "id": generalDetailId,
                "property_id": propertyId,
                "detail": "Bedrooms",
                "value": 2
            }
        ],
        "propertyLocation": {
            "property_id": propertyId,
            "country": "Netherlands",
            "city": "Haarlem",
            "street": "Kinderhuissingel",
            "houseNumber": 6,
            "houseNumberExtension": "K",
            "postalCode": "2013 AS"
        },
        "propertyPricing": {
            "property_id": propertyId,
            "roomRate": 100,
            "cleaning": 10
        },
        "propertyRules": [
            {
                "property_id": propertyId,
                "rule": "PetsAllowed",
                "value": true
            }
        ],
        "propertyType": {
            "property_id": propertyId,
            "property_type": "Camper",
            "spaceType": "Full House"
        },
        "propertyImages": [
            {
                "property_id": propertyId,
                "key": "images/1/1/1.png",
                "image": image
            },
            {
                "property_id": propertyId,
                "key": "images/1/1/1.png",
                "image": image
            },
            {
                "property_id": propertyId,
                "key": "images/1/1/1.png",
                "image": image
            },
            {
                "property_id": propertyId,
                "key": "images/1/1/1.png",
                "image": image
            },
            {
                "property_id": propertyId,
                "key": "images/1/1/1.png",
                "image": image
            },
        ],
        "propertyTechnicalDetails": {
            "property_id": propertyId,
            "length": 500,
            "height": 200,
            "fuelConsumption": 100,
            "speed": 50,
            "renovationYear": 2022,
            "transmission": "Automatic",
            "generalPeriodicInspection": 2020,
            "fourWheelDrive": true
        }
    }
}
