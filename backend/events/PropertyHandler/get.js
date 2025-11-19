import { handler } from "../../functions/PropertyHandler/index.js";

async function main() {
  const result = await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
      subResource: "listingDetails",
    },
    queryStringParameters: {
      property: "c759a4b7-8dcf-4544-a6cf-8df7edf3a7e8"
    },
    headers: {
      Authorization: "", 
    },
  });
  console.log(JSON.parse(result.body).properties)
}

main();