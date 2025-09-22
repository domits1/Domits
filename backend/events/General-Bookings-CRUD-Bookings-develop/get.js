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
            readType: "property",
            property_Id: "c759a4b7-8dcf-4544-a6cf-8df7edf3a7e8", 
        }
    }));
}

get();