import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post(){
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: await getHostAuthToken(),
        },
        body:{
        "identifiers": {
            "property_Id": "23c5e802-1487-4c59-a0a8-47fd5cba8110"
        },
        "general": {
            "guests": 1,
            "arrivalDate": 1748995200000,   
            "departureDate": 1749513600000,
        }
        } 
    }));
}

post();