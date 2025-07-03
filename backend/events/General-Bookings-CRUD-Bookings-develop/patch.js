import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function patch(){
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "PATCH",
        headers: {
            Authorization: await getHostAuthToken(),
        },
        body: JSON.stringify ({ 
            "bookingId": "affc70ed-cfb5-4f52-8e81-8068afb2b094",
            "paymentIntent": "123123"
        })
    }));
}

patch();