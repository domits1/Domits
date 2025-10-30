import { getHostAuthToken } from "../../util/getHostAuthToken.js";

module.exports = (async () => {
    const authToken = await getHostAuthToken();
    return {
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "DELETE",
        headers: {
            Authorization: authToken,
        },
        body: JSON.stringify({
            bookingId: "test-booking-id"
        })
    };
})();
