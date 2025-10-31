import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post() {
  console.log(
    await handler({
      httpMethod: "POST",
      path: "/set-payout-schedule",
      resource: "/set-payout-schedule",
      headers: {
        Authorization:
            await getHostAuthToken,
      },
      body: JSON.stringify({
        interval: "monthly",
        // weekly_anchor: "Thursday",
        monthly_anchor: 26,
      }),
    })
  );
}

post();
