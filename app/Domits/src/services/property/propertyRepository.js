import retrieveAccessToken from "../../features/auth/RetrieveAccessToken";

class PropertyRepository {

    constructor() {
    }

    async fetchPropertyDetails(id) {
        try {
            const response = await fetch(
                `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${id}`,
            );
            if (!response.ok) {
                throw {message: await response.json()};
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async fetchAllPropertyTypes(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) {
        try {
            const response = await fetch(
                `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all?lastEvaluatedKeyCreatedAt=${lastEvaluatedKeyCreatedAt}&lastEvaluatedKeyId=${lastEvaluatedKeyId}`,
            );
            if (!response.ok) {
                throw {message: await response.json()};
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async fetchPropertyByCountry(country, lastEvaluatedKeyId, lastEvaluatedKeyCity) {
        try {
            const response = await fetch(
                `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byCountry?country=${country}&lastEvaluatedKeyId=${lastEvaluatedKeyId}&lastEvaluatedKeyCity=${lastEvaluatedKeyCity}`,
            );
            if (!response.ok) {
                throw {message: await response.json()};
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async fetchPropertyByBookingId(bookingId) {
        try {
            const response = await fetch(
                `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/booking?bookingId=${bookingId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': await retrieveAccessToken(),
                    }
                }
            );
            if (!response.ok) {
                throw {message: await response.json()};
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async getPropertiesList(properties) {
        const response = await fetch(
            `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=${properties.join(",")}`, {
                method: 'GET',
            }
        );
        if (!response.ok) {
            throw new Error("Something went wrong while fetching properties.");
        }
        return await response.json();
    }
}

export default PropertyRepository;
