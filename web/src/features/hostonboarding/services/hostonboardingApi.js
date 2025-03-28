import axios from "axios";



export async function printAccoInfo() {
    console.log('test: \n', mockData)

    console.log(JSON.stringify(mockData, null, 2));

}
export async function submitAccommodation() {
    // TODO Implement proper cognito security service
    // Retrieve the token from localStorage
    const authToken = localStorage.getItem("CognitoIdentityServiceProvider.78jfrfhpded6meevllpfmo73mo.329b44d1-14c7-4af7-94bc-3424af6c535d.accessToken");

    // Check if token is retrieved
    if (!authToken) {
        console.error("User not logged in. Authtoken not found in expected place.");
        return;
    }

    const API_BASE_URL =
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property?type=Boat";

    const request = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": authToken,
        },
        body: JSON.stringify(mockData), // Stringify the data object
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
        //
        //
        // // Using Axios
        // const axiosResponse = await axios.post(API_BASE_URL, mockData , {
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        // });
        // const axiosResponseData = await axiosResponse.json()
        //
        // console.log(axiosResponse)
        // console.log(axiosResponseData)

        // return axiosResponse.data;
        return response2Data;
    } catch (error) {
        console.error("Error uploading accommodation:", error);
        throw error;
    }
}

const nowDate = Date.now();
const futureDate = nowDate + Math.floor(Math.random() * 1000000000); // Some random future date


const mockData = {
    property: {
        id: "1",
        hostId: "4e13c251-a3cd-4952-b308-e3572b0b1e6b",
        title: "Test Property",
        subtitle: "Test Subtitle",
        description: "A simple test property",
        guestCapacity: 2,
        registrationNumber: "TEST123",
        status: "ACTIVE",
        createdAt: futureDate,
        updatedAt: futureDate,
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
