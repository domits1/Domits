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
            readType: "guest",
            guest_Id: "6b37c21b-4372-495f-8ca0-ac4ba4a340fc"
        }
    };
})();