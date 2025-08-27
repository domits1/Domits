import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"

async function patch(){
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "PATCH",
        body: JSON.stringify ({ 
            "paymentid": "pi_3S0kBaGiInrsWMEc1pdEpeJU"
        })
    }));
}

patch();