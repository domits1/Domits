import { getAuthToken } from "../../util/getAuthToken";

module.exports = (async () => {
    const authToken = await getAuthToken();
    return {
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "GET",
        headers: {
            Authorization: authToken,
        },
        queryStringParameters: {
            readType: "property",
            property_Id: "TEST-89a4-4e52-a940-3e4f79dabdd7"
        }
    };
})();