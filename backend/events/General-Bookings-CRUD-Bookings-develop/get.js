// TODO Create your own get event to your handler function.
import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: "empty",
        },
        queryStringParameters: {
            readType: "hostId",
        }
    }));
}

get();