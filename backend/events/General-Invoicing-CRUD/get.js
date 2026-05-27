import { handler } from "../function/index.js";

console.log(await handler({
    httpMethod: "GET",
    path: "/invoices",
    headers: { Authorization: "TEST_HOST_TOKEN" },
}));
