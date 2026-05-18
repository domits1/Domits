import { handler } from "../function/index.js";

await handler({
    httpMethod: "GET",
    path: "/team",
    headers: { Authorization: "your-access-token-here" }
});
