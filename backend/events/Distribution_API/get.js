import {handler} from "../../functions/Distribution_API/index.js";

async function main() {
    console.log(await handler({
        httpMethod: "GET",
        queryStringParameters: {
            propertyId: "3bdf949f-d58a-488e-8150-8bae30c46fee"
        }
    }));
}

main();