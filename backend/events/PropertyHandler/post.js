import {handler} from "../../functions/PropertyHandler/index.js";
import {getHostAuthToken} from "../../test/util/getHostAuthToken.js";
import {image} from "../../test/PropertyHandler/events/approvedImage.js";

async function main() {
    console.log(await handler({
        httpMethod: "POST",
        headers: {
            Authorization:  await getHostAuthToken(),
        },
        body: JSON.stringify({
            "property": {
                "id": "e65ceab8-f77e-4d6f-b1f3-198f41b47f3e",
                "hostId": "f08999d3-697c-44a0-b388-a414178d4c5b",
                "title": "Grote Test Property",
                "subtitle": "Relaxing way to eat",
                "description": "a historic windmill built on the remnants of a medieval castle, offering a perfect blend of old-world charm and modern comfort. Fully renovated in 2006, this stunning windmill features spacious living areas, two cozy bedrooms, and two modern bathrooms. Enjoy breathtaking garden views and unwind in the tranquil surroundings. Whether you're cycling, hiking, or just relaxing on your private patio, Maurik offers a peaceful retreat with easy access to Utrecht, Den Bosch, Arnhem, and Nijmegen. Ideal for families or small groups looking to explore the beauty of the Dutch countryside.",
                "guestCapacity": 6,
                "registrationNumber": "99797787798798787978789877987999",
                "status": "ACTIVE",
                "propertyType": "House",
                "createdAt": Date.now() + 100000,
                "updatedAt": 0
            },
            "propertyAmenities": [
                {
                    "id": "96757566-ef9a-46ea-9ac3-f05460f28555",
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "amenityId": "1"
                },
            ],
            "propertyAvailability": [
                {
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "availableStartDate": 1786185200000,
                    "availableEndDate": 1808863600000
                },
                {
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "availableStartDate": 1774316000000,
                    "availableEndDate": 1781801200000
                }
            ],
            "propertyAvailabilityRestrictions": [
                {
                    "id": "12345",
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "restriction": "MaximumNightsPerYear",
                    "value": 25
                },
                {
                    "id": "50414d04-5d84-426e-b58e-30e6c1487424",
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "restriction": "MaximumStay",
                    "value": 1
                }
            ],
            "propertyCheckIn": {
                "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
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
                    "id": "fc06aa69-f6c1-438d-afc6-e5575385a973",
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "detail": "Beds",
                    "value": 5
                },
                {
                    "id": "6287fbe0-f657-4705-a0d5-2e81b61b7222",
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "detail": "Bathrooms",
                    "value": 2
                },
                {
                    "id": "509ae155-4cd9-4dbb-9f61-5c618e618327",
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "detail": "Bedrooms",
                    "value": 4
                },
                {
                    "id": "1a8d0093-72bb-4785-a65e-0b0b2aeca24d",
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "detail": "Guests",
                    "value": 6
                }
            ],
            "propertyImages": [
                {
                    "image": image,
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "key": "images/1/9/Picture1.png"
                },
                {
                    "image": image,
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "key": "images/1/9/Picture2.png"
                },
                {
                    "image": image,
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "key": "images/1/9/Picture3.png"
                },
                {
                    "image": image,
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "key": "images/1/9/Picture4.png"
                },
                {
                    "image": image,
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "key": "images/1/9/Picture5.png"
                }
            ],
            "propertyLocation": {
                "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                "country": "Netherlands",
                "city": "Maurik",
                "street": "Maurikkenstraat",
                "houseNumber": 6,
                "houseNumberExtension": "K",
                "postalCode": "11515 AS"
            },
            "propertyPricing": {
                "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                "roomRate": 322,
                "cleaning": 10
            },
            "propertyRules": [
                {
                    "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                    "rule": "PetsAllowed",
                    "value": true
                },
            ],
            "propertyType": {
                "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                "property_type": "House",
                "spaceType": "Full house"
            },
            "propertyTechnicalDetails": {
                "property_id": "bf3ecb5f-2106-45e6-a054-c28f3dd91638",
                "length": 500,
                "height": 200,
                "fuelConsumption": 100,
                "speed": 120,
                "renovationYear": 2022,
                "transmission": "Automatic",
                "generalPeriodicInspection": 2020,
                "fourWheelDrive": true
            }
        })
    }));
}

main();