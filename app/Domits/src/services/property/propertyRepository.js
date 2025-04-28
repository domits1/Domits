class PropertyRepository {

    constructor() {}

    async fetchPropertyDetails(id) {
        try {
            const response = await fetch(
                `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${id}`,
            );
            return await response.json();
        } catch (error) {
            console.error(error);
        }
    }

    async fetchAllPropertyTypes(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) {
        try {
            const response = await fetch(
                `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all?lastEvaluatedKeyCreatedAt=${lastEvaluatedKeyCreatedAt}&lastEvaluatedKeyId=${lastEvaluatedKeyId}`,
            );
            return await response.json();
        } catch (error) {
            console.error(error);
        }
    }
}

export default PropertyRepository;
