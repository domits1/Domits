import { handler } from "../../functions/General-Payments-Production-Create-StripeAccount/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post() {
  console.log(
    await handler({
      httpMethod: "POST",
      path: "/create-stripe-account",
      resource: "/create-stripe-account",
      headers: {
        Authorization: getHostAuthToken(),
      },
    })
  );
}

post();
