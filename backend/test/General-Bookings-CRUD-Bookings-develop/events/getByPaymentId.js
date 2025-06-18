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
            readType: "paymentId",
            paymentID: "TEST-99aa-4d81-a9ac-4b0a4a59c0de"
        }
    };
})();