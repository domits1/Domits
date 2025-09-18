import { handler } from "../../functions/General-Payments-Production-Create-StripeAccount/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get() {
  console.log(
    await handler({
      httpMethod: "GET",
      path: "/retrieve-stripe-account",
      resource: "/retrieve-stripe-account",
      headers: {
        Authorization: await getHostAuthToken(),
      },
    })
  );
}

get();
