import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get() {
  console.log(
    await handler({
      httpMethod: "GET",
      path: "/retrieve-user-pending-amount",
      resource: "/retrieve-user-payouts",
      headers: {
        Authorization:
          await getHostAuthToken(),
      },
    })
  );
}

get();
