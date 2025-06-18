import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getAuthToken } from "../../test/util/getAuthToken.js";
async function post(){
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: await getAuthToken(),
        },
        body:{
        "identifiers": {
            "property_Id": "6637379f-efe4-4a13-b3ec-092f2dacee70"
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