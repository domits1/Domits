import { handler } from "../../functions/General-Payments-Production-Read-CheckIfStripeExists/index.js";

async function main() {
  const event = {
    httpMethod: "POST",
    body: JSON.stringify({ sub: "f08999d3-697c-44a0-b388-a414178d4c5b" }),
  };
  const res = await handler(event);
  console.log(res);
}

main();
