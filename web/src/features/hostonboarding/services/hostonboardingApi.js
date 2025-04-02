import useFormStore from "../stores/formStore";
import mockData from './data/mockData.json';

export async function submitAccommodation() {

    const onboardingData = mockData;

    // TODO Implement proper cognito security service
    // Retrieve the token from localStorage
    const authToken = localStorage.getItem("CognitoIdentityServiceProvider.78jfrfhpded6meevllpfmo73mo.329b44d1-14c7-4af7-94bc-3424af6c535d.accessToken");
    const {accommodationDetails} = useFormStore.getState();
    console.log("accommodationDetails: ", accommodationDetails)

    // Check if token is retrieved
    if (!authToken) {
        console.error("User not logged in. Authtoken not found in expected place.");
        return;
    }

    const API_BASE_URL =
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

    console.log("Submitting data:", onboardingData || mockData);

    const request = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": authToken,
        },
        body: JSON.stringify(onboardingData || mockData), // Stringify the data object or use mockdata
    };

    try {
        // Using Fetch
        console.log("Start submitAccommodation, using url: ", API_BASE_URL);
        console.log("request:\n", request);

        const response = await fetch(API_BASE_URL, request);
        return response;
    } catch (error) {
        throw error;
    }
}
