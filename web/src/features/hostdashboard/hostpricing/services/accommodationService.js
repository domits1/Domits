import { Auth } from "aws-amplify";

const API_BASE_URL = 'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev';

export const accommodationService = {
  async getUserId() {
    try {
      const userInfo = await Auth.currentUserInfo();
      return userInfo.attributes.sub;
    } catch (error) {
      console.error("Error getting user ID:", error);
      throw new Error("Failed to get user ID");
    }
  },

  async fetchAccommodations(userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/Host-Onboarding-Production-Read-AccommodationRatesByOwner`,
        {
          method: 'POST',
          body: JSON.stringify({ UserId: userId }),
          headers: {
            'Content-type': 'application/json; charset=UTF-8',
          }
        }
      );

      const data = await response.json();
      if (!data.body) throw new Error('Invalid response format');
      
      const parsedBody = JSON.parse(data.body);
      if (!Array.isArray(parsedBody)) {
        throw new Error('Retrieved data is not an array');
      }
      
      return parsedBody;
    } catch (error) {
      console.error("Error fetching accommodation data:", error);
      throw error;
    }
  },

  async updateAccommodationRates(accommodations) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/Host-Onboarding-Production-Update-AccommodationRates`,
        {
          method: 'PUT',
          body: JSON.stringify({ Accommodations: accommodations }),
          headers: {
            'Content-type': 'application/json; charset=UTF-8',
          }
        }
      );

      const data = await response.json();
      const parsedBody = JSON.parse(data.body);

      if (!parsedBody || typeof parsedBody !== 'object') {
        throw new Error('Invalid response format');
      }

      return parsedBody;
    } catch (error) {
      console.error("Error updating accommodation rates:", error);
      throw error;
    }
  }
}; 