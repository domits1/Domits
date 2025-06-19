import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: await getHostAuthToken(),
        },
        queryStringParameters: {
            readType: "guest",
            guest_Id: "6b37c21b-4372-495f-8ca0-ac4ba4a340fc"
        }
    }));
}

get();