// TODO Create your own get event to your handler function.

import {handler} from "../../functions/Alessio-Test/index.js";

async function main() {
    console.log(await handler({
        httpMethod: "GET",
        path: "/hello",
    }));
}

main();