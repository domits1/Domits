// TODO Create your own get event to your handler function.

import {handler} from "../property-dynamic-price/index.js";

async function main() {
    console.log(await handler({
        httpMethod: "GET"
    }));
}

main();