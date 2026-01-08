import { handler } from "../../functions/PropertyHandler/index.js";

async function main() {
  const result = await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
      subResource: "listingDetails",
    },
    queryStringParameters: {
      property: "113131c2-6b35-4652-91e7-b69948f2b54f",
      format: "", // request Holidu-formatted payload
    },
    headers: {
      Authorization: "",
    },
  });
  console.log(JSON.parse(result.body));
}

main();
