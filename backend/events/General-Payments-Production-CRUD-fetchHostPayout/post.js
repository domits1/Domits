import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post() {
  console.log(
    await handler({
      httpMethod: "POST",
      path: "/add-user-bank-account",
      resource: "/set-payout-schedule",
      headers: {
        Authorization:
          await getHostAuthToken(),
      },
      body: JSON.stringify({
        country: "UK",
        currency: "GBP",
        accountHolderName: "John Doe",
        accountHolderType: "individual",
        routingNumber: "110000000",
        accountNumber: "000123456789",
      }),
    })
  );
}

post();
