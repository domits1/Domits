import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post(){
    console.log(
      await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
          Authorization: await getHostAuthToken(),
        },
        body: {
          identifiers: {
            property_Id: "599c1c7a-b046-4469-9899-65359dba9ec0",
          },
          general: {
            guests: 1,
            arrivalDate: 1748995200000,
            departureDate: 1749513600000,
          },
        },
      })
    );
}

post();