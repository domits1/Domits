import useFormStore from "../stores/formStore";
import mockData from './data/mockData.json';
import {getAccessToken} from "../../../services/getAccessToken";

export async function submitAccommodation() {
    const {API_BASE_URL, request} = collectData();
    return await postNewAccommodation();

    async function postNewAccommodation() {
        try {
            console.log("Start submitAccommodation, using url: ", API_BASE_URL);
            console.log("request:\n", request);

            const response = await fetch(API_BASE_URL, request);
            return response;
        } catch (error) {
            throw error;
        }
    }


    function collectData() {
        // API URL
        const API_BASE_URL = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

        // Retrieve form data from FormStore
        let accommodationDetails = useFormStore.getState();
        accommodationDetails = mockData;

        console.log("accommodationDetailsBuilder:\n\n", accommodationDetailsBuilder);
        // Log the formStore data
        console.log(
            "Submitting accommodationDetails: ",
            JSON.stringify(accommodationDetails, null, 2),
        );
        const request = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": getAccessToken(),    // Retrieve the token from localStorage
            },
            body: JSON.stringify(accommodationDetails), // Use the REAL form data
        };
        return {API_BASE_URL, request};
    }
}
