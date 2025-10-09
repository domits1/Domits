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
            readType: "hostId",
            property_Id: "a7a438d5-528d-4578-85ef-d3282ce92e6e"
        }
    };
})();