import { handler } from "../../functions/ReviewSystem/index.js";

async function main() {
  const result = await handler({
    httpMethod: "OPTIONS",
    path: "/reviews",
    headers: {},
  });

  console.log(result);
}

main();