import useFormStore from "../stores/formStore";
import mockData from './data/mockData.json';
import {getAccessToken} from "../../../services/getAccessToken";

export async function submitAccommodation() {

    const onboardingData = mockData;

    // Retrieve the token from localStorage
    const authToken = getAccessToken;

    // Retrieve formdata
    const {accommodationDetails} = useFormStore.getState();
    console.log("accommodationDetails: ", accommodationDetails)

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
