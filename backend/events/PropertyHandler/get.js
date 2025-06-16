import { handler } from "../../functions/PropertyHandler/index.js";

async function main() {
  console.log(await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
      subResource: "all",
    },
    queryStringParameters: {
      bookingId: "9566261c-99d7-4b3a-af08-ad8bb9721d94"
    },
    headers: {
      Authorization: ""
    },
  }));
}

main();