import NotFoundException from "../util/exception/NotFoundException.js";

const BASE_URL =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";

class DistributionRepository {
  async getListingDetailsByPropertyId(propertyId) {
    const url = `${BASE_URL}/property/bookingEngine/listingDetails?property=${propertyId}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data === "Property undefined not found or inactive.") {
      throw new NotFoundException(
        `No listing details found for property ${propertyId}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Distribution API returned status ${response.status} for ${url}`
      );
    }

    return data;
  }
}

export default DistributionRepository;  
