import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
import { getAuthToken } from "../../test/util/getAuthToken.mjs";

async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: await getAuthToken(),
        },
        queryStringParameters: {
            readType: "guest",
        }
    }));
}

get();