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
            readType: "departureDate",
            departureDate: "1744848000000",
            property_Id: "6637379f-efe4-4a13-b3ec-092f2dacee70"
        }
    }));
}

get();