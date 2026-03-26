import { handler } from "../../functions/Alessio-Revenue/index.js";

async function main() {
  const event = {
    httpMethod: "GET",
    headers: {
      Authorization: "Bearer YOUR_TEST_TOKEN",
    },
    queryStringParameters: {
      metric: "all",
      filterType: "weekly",
    },
  };

  const response = await handler(event);

  console.log("Response:", response);
}

main();