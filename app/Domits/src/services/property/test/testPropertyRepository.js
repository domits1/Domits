import listingDetails from "./listingDetails.json";
import propertyTypes from "./propertyTypes.json";

class TestPropertyRepository {

    constructor() {}

    async fetchPropertyDetails(id) {
       return listingDetails
    }

    async fetchAllPropertyTypes(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) {
        return propertyTypes
    }

    async fetchPropertyByCountry(country, lastEvaluatedKeyId, lastEvaluatedKeyCity) {
        return propertyTypes
    }
}

export default TestPropertyRepository;
