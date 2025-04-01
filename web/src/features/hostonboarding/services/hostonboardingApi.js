import useFormStore from "../stores/formStore";

export async function submitAccommodation(data) {
    // TODO Implement proper cognito security service
    // Retrieve the token from localStorage
    const authToken = localStorage.getItem("CognitoIdentityServiceProvider.78jfrfhpded6meevllpfmo73mo.329b44d1-14c7-4af7-94bc-3424af6c535d.accessToken");
    const {accommodationDetails} = useFormStore.getState();
console.log(accommodationDetails)


    // Check if token is retrieved
    if (!authToken) {
        console.error("User not logged in. Authtoken not found in expected place.");
        return;
    }

    // Check if token is retrieved
    if (!data) {
        console.error("form not filled in.");
        data = mockData;
    }

    const API_BASE_URL =
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

    const request = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": authToken,
        },
        body: JSON.stringify(data), // Stringify the data object
    };

    try {
        // Using Fetch
        console.log("Start submitAccommodation, using url: ", API_BASE_URL);
        console.log("request:\n", request);

        const response2 = await fetch(API_BASE_URL, request);
        const response2Data = await response2.json();

        console.log("response2" + response2)
        console.log("response2.data" + response2.data)
        console.log(response2Data)
        return response2Data;
    } catch (error) {
        console.error("Error uploading accommodation:", error);
        throw error;
    }
}

const nowDate = Date.now();
const maxFutureRange = 1000000000; // Limit to roughly 31.7 years into the future
const futureDate = nowDate + Math.floor(Math.random() * maxFutureRange);


const mockData = {
    property: {
        id: "1",
        hostId: "4e13c251-a3cd-4952-b308-e3572b0b1e6b",
        title: "Test Property RYAN",
        subtitle: "Test Subtitle",
        description: "A simple test property",
        guestCapacity: 2,
        registrationNumber: "TEST123",
        status: "ACTIVE",
        createdAt: futureDate,
        updatedAt: futureDate,
    },
    propertyAmenities: [
        {
            id: "1",
            property_id: "1",
            amenityId: "1"
        }
    ],
    propertyAvailability: [
        {
            property_id: "1",
            availableStartDate: "1943044811776",
            availableEndDate: "1943082436364"
        }
    ],
    propertyAvailabilityRestrictions: [
        {
            id: 1,
            property_id: 1,
            restriction: "MaximumStay",
            value: 1
        }
    ],
    propertyCheckIn: {
        property_id: 1,
        checkIn: {
            from: 1,
            till: 2
        },
        checkOut: {
            from: 1,
            till: 2
        }
    },
    propertyGeneralDetails: [
        {
            id: 1,
            property_id: 1,
            detail: "Bedrooms",
            value: 2
        }
    ],
    propertyLocation: {
        property_id: 1,
        country: "Netherlands",
        city: "Haarlem",
        street: "Kinderhuissingel",
        houseNumber: 6,
        houseNumberExtension: "K",
        postalCode: "2013 AS",
    },
    propertyPricing: {
        property_id: 1,
        roomRate: 100,
        cleaning: 10,
        service: 5,
    },
    propertyRules: [
        {
            property_id: 1,
            rule: "PetsAllowed",
            value: true,
        },
    ],
    propertyType: {
        property_id: 1,
        property_type: "Camper",
        spaceType: "Full house"
    },
    propertyImages: [
        {
            property_id: 1,
            key: "images/1/1/1.png"
        }
    ],
    propertyTechnicalDetails: {
        property_id: 1,
        length: 500,
        height: 200,
        fuelConsumption: 100,
        speed: 50,
        renovationYear: 2022,
        transmission: "Automatic",
        generalPeriodicInspection: 2020,
        fourWheelDrive: true
    }
};
