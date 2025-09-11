import { handler } from "../../functions/General-Payments-Production-Create-StripeAccount/index.js";

async function main() {
  const event = {
    httpMethod: "POST",
    body: JSON.stringify({
      userEmail: "Singhgurpreet14082002@gmail.com",
      cognitoUserId: "f08999d3-697c-44a0-b388-a414178d4c5b",
    }),
  };
  const res = await handler(event);
  console.log(res);
}

main();
