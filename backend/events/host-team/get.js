import { handler } from "../function/index.js";

console.log(await handler({
    httpMethod: "GET",
    path: "/team",
    headers: { Authorization: "your-access-token-here" }
}));
