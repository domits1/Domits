import { getAuthToken } from "../../util/getAuthToken";

module.exports = (async () => {
    return {
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: await getAuthToken(),
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