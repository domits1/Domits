import { handler } from "../../functions/Get-Booking-Data/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get() {
  console.log(
    await handler({
      httpMethod: "GET",
      path: "/get-booking-by-guestid",
      resource: "/retrieve-user-payouts",
      headers: {
        Authorization:
          await getHostAuthToken,
      },
    })
  );
}

get();