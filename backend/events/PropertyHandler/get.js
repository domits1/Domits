import { handler } from "../../functions/PropertyHandler/index.js";

async function main() {
  console.log(await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
      subResource: "set",
    },
    queryStringParameters: {
      "properties": "606519ba-89a4-4e52-a940-3e4f79dabdd7"
    },
    headers: {},
  }));
}

main();