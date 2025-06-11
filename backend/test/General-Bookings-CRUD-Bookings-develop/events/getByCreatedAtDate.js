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
            readType: "createdAt",
            createdAt: "1746057600000",
            property_Id: "e2ef4793-7376-458b-b4e5-7eba2a9deb79", 
        }
    };
})();