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
            "property_Id": "42a335b3-e72e-49ee-bc8d-ed61e9bd35e5"
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