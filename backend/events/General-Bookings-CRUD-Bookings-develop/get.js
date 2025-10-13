import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: await getHostAuthToken()
        },
        queryStringParameters: {
            readType: "hostId",
            property_Id: "a7a438d5-528d-4578-85ef-d3282ce92e6e"
        }
    }));
}

get();