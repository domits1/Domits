import { handler } from "../../functions/PropertyHandler/index.js";

async function main() {
  console.log(await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
<<<<<<< HEAD
      subResource: "byType",
=======
      subResource: "set",
>>>>>>> parent of 8e985a83a (Merge branch 'acceptance' of https://github.com/domits1/domits into feature/multi-language-mobile)
    },
    queryStringParameters: {
      "properties": "606519ba-89a4-4e52-a940-3e4f79dabdd7"
    },
<<<<<<< HEAD
    headers: {
      Authorization: ""
    },
=======
    headers: {},
>>>>>>> parent of 8e985a83a (Merge branch 'acceptance' of https://github.com/domits1/domits into feature/multi-language-mobile)
  }));
}

main();