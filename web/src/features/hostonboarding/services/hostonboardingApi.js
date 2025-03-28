import axios from "axios";


const formData = {
    property: {
        id: "1",
        hostId: "4e13c251-a3cd-4952-b308-e3572b0b1e6b",
        title: "Test Property",
        subtitle: "Test Subtitle",
        description: "A simple test property",
        guestCapacity: 2,
        registrationNumber: "TEST123",
        status: "ACTIVE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    propertyLocation: {
        property_id: "1",
        country: "Netherlands",
        city: "Haarlem",
        street: "Kinderhuissingel",
        houseNumber: 6,
        houseNumberExtension: "K",
        postalCode: "2013 AS",
    },
    propertyPricing: {
        property_id: "1",
        roomRate: 100,
        cleaning: 10,
        service: 5,
    },
    propertyRules: [
        {
            property_id: "1",
            rule: "PetsAllowed",
            value: true,
        },
    ],
};

export async function submitAccommodation(formData) {
    const API_BASE_URL =
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/CreateAccomodation";

    const request = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    };

    try {
        // Using Fetch
        console.log("Start submitAccommodation, using url: ", API_BASE_URL);
        console.log("form:\n", formData);

        const response2 = fetch(API_BASE_URL, request);
        const response2Data = await response2.json()

        console.log(response2)
        console.log(response2Data)


        // Using Axios
        const axiosResponse = await axios.post(API_BASE_URL, formData, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        const axiosResponseData = await axiosResponse.json()

        console.log(axiosResponse)
        console.log(axiosResponseData)

        return axiosResponse.data;
    } catch (error) {
        console.error("Error uploading accommodation:", error);
        throw error;
    }
}
