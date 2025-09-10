import { handler } from "../../functions/General-Payments-Production-Read-CheckIfStripeExists/index.js";

async function main() {
  const event = {
    httpMethod: "POST",
    body: JSON.stringify({ sub: "TEST-COGNITO-SUB-123" }),
  };
  const res = await handler(event);
  console.log(res);
}

main();
