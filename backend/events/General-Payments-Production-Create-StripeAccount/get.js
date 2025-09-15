import { handler } from "../../functions/General-Payments-Production-Create-StripeAccount/index.js";

async function main() {
  const event = {
    httpMethod: "GET",
    headers: {
      Authorization: await getAccessToken(), // Replace with your actual token.
    },
    body: JSON.stringify({}),
  };
  const res = await handler(event);
  console.log(res);
}

main();
