// TODO Create your own get event to your handler function.

import {handler} from "../../functions/Alessio-Revenue/index.js";

async function main() {
    console.log(await handler({
        httpMethod: "GET",
        headers: {
            Authorization: "",
        },
        body: {
            hostId: ""
        }

    }));
}

main();