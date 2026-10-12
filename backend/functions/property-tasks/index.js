import { Controller } from "./controller/controller.js";

let controller = null;

const ACTION_ROUTES = {
    GET: {
        'upload-url': 'getUploadUrl',
        'view-url': 'getViewUrl',
        'checklist': 'getChecklistItems',
    },
    POST: {
        'checklist': 'createChecklistItem',
        'escalate': 'escalateTask',
    },
    PATCH: {
        'checklist': 'updateChecklistItem',
    },
    DELETE: {
        'checklist': 'deleteChecklistItem',
    },
};

const DEFAULT_ROUTES = {
    GET: 'getTasks',
    POST: 'createTask',
    PATCH: 'updateTask',
    DELETE: 'deleteTask',
};

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export const handler = async (event) => {
    try {
        if (!controller) {
            controller = new Controller();
        }

        if (event.httpMethod === "OPTIONS") {
            return {
                statusCode: 200,
                headers: {
                    ...CORS_HEADERS,
                    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization"
                }
            };
        }

        const methodRoutes = ACTION_ROUTES[event.httpMethod];
        if (!methodRoutes) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: `Method ${event.httpMethod} not supported.` })
            };
        }

        const action = event.queryStringParameters?.action;
        const methodName = methodRoutes[action] || DEFAULT_ROUTES[event.httpMethod];
        return await controller[methodName](event);
    } catch (error) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: "Internal Server Error",
                error: error.message
            })
        };
    }
};
