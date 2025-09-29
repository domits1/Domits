import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get() {
  console.log(
    await handler({
      httpMethod: "GET",
      path: "/retrieve-suser-payout",
      resource: "/retrieve-suser-payout",
      headers: {
        Authorization: await getHostAuthToken(),
      },
    })
  );
}

get();
