import { getHostAuthToken } from "../../util/getHostAuthToken.js";

module.exports = (async () => {
    const authToken = await getHostAuthToken();
    return {
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: authToken,
        },
        body: {
            identifiers: {
                property_Id: "3763b443-6a49-476f-a7fa-5c39288cc21c"
            },
            general: {
                guests: 1,
                arrivalDate: 1747094400000,
                departureDate: 1747180800000
            }
        }
    };
})();