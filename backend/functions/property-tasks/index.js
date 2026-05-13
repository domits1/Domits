import { Controller } from "./controller/controller.js";

let controller = null;

export const handler = async (event) => {

    try {
        if (!controller) {
            controller = new Controller();
        }

        switch (event.httpMethod) {
            case "GET":
                if (event.queryStringParameters?.action === 'upload-url') {
                    return await controller.getUploadUrl(event);
                }
                if (event.queryStringParameters?.action === 'view-url') {
                    return await controller.getViewUrl(event);
                }
                return await controller.getTasks(event);
            
            case "POST":
                return await controller.createTask(event);

            case "PATCH":
                return await controller.updateTask(event);

            case "DELETE":
                return await controller.deleteTask(event);

            case "OPTIONS":
                return {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type,Authorization"
                    }
                };

            default:
                return {
                    statusCode: 404,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: `Method ${event.httpMethod} not supported.` })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ 
                message: "Internal Server Error",
                error: error.message 
            })
        };
    }
};