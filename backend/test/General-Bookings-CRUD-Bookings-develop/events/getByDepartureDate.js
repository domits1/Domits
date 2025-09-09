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
            readType: "departureDate",
            departureDate: "1744848000000",
            property_Id: "6637379f-efe4-4a13-b3ec-092f2dacee70"
        }
    };
})();   