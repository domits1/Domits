import { getHostAuthToken } from "../../util/getHostAuthToken.js";

module.exports = (async () => {
    const authToken = await getHostAuthToken();
    console.log(authToken);
    return {
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: authToken,
        },
        body: {
            identifiers: {
                property_Id: "6637379f-efe4-4a13-b3ec-092f2dacee70"
            },
            general: {
                guests: 1,
                arrivalDate: 1747094400000,
                departureDate: 1747180800000
            }
        }
    };
})();