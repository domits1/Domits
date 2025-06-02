import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: ".",
        },
        queryStringParameters: {
            readType: "hostId",
        }
    }));
}

get();