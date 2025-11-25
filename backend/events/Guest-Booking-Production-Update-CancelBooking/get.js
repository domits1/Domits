// TODO Create your own get event to your handler function.

import {handler} from "../../functions/Guest-Booking-Production-Update-CancelBooking/index.js";

async function main() {
    console.log(await handler({
        httpMethod: "GET"
    }));
}

main();