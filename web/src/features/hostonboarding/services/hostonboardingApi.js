import axios from "axios";

export const uploadAccommodation = async (accommodationData) => {
  const API_BASE_URL =
    "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/CreateAccomodation";

  try {
    const response = await axios.post(API_BASE_URL, accommodationData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading accommodation:", error);
    throw error;
  }
};
