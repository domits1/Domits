import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function deleteBooking(){
    console.log(
      await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "DELETE",
        headers: {
          Authorization: await getHostAuthToken(),
        },
        body: JSON.stringify({
          bookingId: "your-booking-id-here",
        }),
      })
    );
}

deleteBooking();
