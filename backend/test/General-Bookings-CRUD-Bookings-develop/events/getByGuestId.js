import { getHostAuthToken } from "../../util/getHostAuthToken.js";

module.exports = (async () => {
    const authToken = await getHostAuthToken();
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