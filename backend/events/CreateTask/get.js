import {handler} from "../function/index.js";

async function main() {
    console.log(await handler({
        httpMethod: "GET"
    }));
}

main();
