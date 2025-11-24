import { handler } from "./index.js"; 

(async () => {

    const event = {
        httpMethod: "GET",
        pathParameters: {
            id: "b71d0640-fe1e-4601-a6f0-2e6719214fd8" 
        }
    };

    try {
        const response = await handler(event);
        console.log("Lambda Response:");
        console.log(JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
})();
