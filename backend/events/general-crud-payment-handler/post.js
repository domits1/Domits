import { handler } from "../../functions/general-crud-payment-handler/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post() {
  console.log(
    await handler({
      httpMethod: "POST",
      path: "/create-stripe-account",
      resource: "/create-stripe-account",
      headers: {
        Authorization: await getHostAuthToken(),
      },
    })
  );
}

post();
