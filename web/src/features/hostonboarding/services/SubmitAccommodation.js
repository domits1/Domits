import { getAccessToken } from "../../../services/getAccessToken";
import useFormStore from "../stores/formStoreHostOnboarding";

export async function submitAccommodation() {
  // API URL
  const API_BASE_URL =
    "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";
  const request = await collectData();

  async function _fetch() {
    try {
      console.log("Start submitAccommodation, using url: ", API_BASE_URL);
      console.log("request:\n", request);

      const response = await fetch(API_BASE_URL, request);

      if (response.data) {
        /// THIS is the result of the form:
        //Remove this line if you don't want to log the response
        console.log("Accommodation uploaded successfully:", response.data);

        //Remove this line if you don't want to log the response
        if (response.data.statusCode === 200) {
          navigate("/hostdashboard");
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  return await _fetch();

  async function collectData() {
    // Retrieve form data from FormStore
    let accommodationDetails = useFormStore.getState();
    console.log(accommodationDetails.accommodationDetails);

    try {
      if (
        accommodationDetails &&
        Object.keys(accommodationDetails).length > 0
      ) {
        // Log the formdata
        console.log(
          "Collected accommodationDetails: ",
          JSON.stringify(accommodationDetails, null, 2),
        );

        const request = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: getAccessToken(), // Retrieve the token from localStorage
          },
          body: JSON.stringify(accommodationDetails), // Use the REAL form data
        };

        return { request };
      } else {
        console.error("No Formdata found!");
      }
    } catch (error) {
      console.log(error);
    }
  }
}
