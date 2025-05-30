import { handler } from "../../functions/PropertyHandler/index.js";

async function main() {
  console.log(await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
      subResource: "all",
    },
    queryStringParameters: {},
    headers: {},
  }));
}

main();