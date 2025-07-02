import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";
async function post(){
    console.log(await getHostAuthToken());
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: await getHostAuthToken(),
        },
        body:{
        "identifiers": {
            "property_Id": "3763b443-6a49-476f-a7fa-5c39288cc21c"
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