import {randomUUID} from "crypto";
import {image} from "./approvedImage.js";

export function getPropertyObject() {
    return {
        "property": {
            "id": "test",
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
                "id": "test",
                "property_id": "test",
                "amenityId": "1"
            }
        ],
        "propertyAvailability": [
            {
                "property_id": "test",
                "availableStartDate": Date.now() + 60 * 60 * 1000,
                "availableEndDate": Date.now() + 60 * 60 * 1000 * 2
            }
        ],
        "propertyAvailabilityRestrictions": [
            {
                "id": "test",
                "property_id": "test",
                "restriction": "MaximumStay",
                "value": 1
            }
        ],
        "propertyCheckIn": {
            "property_id": "test",
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
                "id": "test",
                "property_id": "test",
                "detail": "Bedrooms",
                "value": 2
            }
        ],
        "propertyLocation": {
            "property_id": "test",
            "country": "Netherlands",
            "city": "Haarlem",
            "street": "Kinderhuissingel",
            "houseNumber": 6,
            "houseNumberExtension": "K",
            "postalCode": "2013 AS"
        },
        "propertyPricing": {
            "property_id": "test",
            "roomRate": 100,
            "cleaning": 10
        },
        "propertyRules": [
            {
                "property_id": "test",
                "rule": "PetsAllowed",
                "value": true
            }
        ],
        "propertyType": {
            "property_id": "test",
            "property_type": "Camper",
            "spaceType": "Full House"
        },
        "propertyImages": [
            {
                "property_id": "test",
                "key": "images/1/1/1.png",
                "image": image
            },
            {
                "property_id": "test",
                "key": "images/1/1/1.png",
                "image": image
            },
            {
                "property_id": "test",
                "key": "images/1/1/1.png",
                "image": image
            },
            {
                "property_id": "test",
                "key": "images/1/1/1.png",
                "image": image
            },
            {
                "property_id": "test",
                "key": "images/1/1/1.png",
                "image": image
            },
        ],
        "propertyTechnicalDetails": {
            "property_id": "test",
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