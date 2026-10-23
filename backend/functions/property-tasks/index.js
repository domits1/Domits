import { Controller } from "./controller/controller.js";

let controller = null;

const OVERDUE_SWEEP_TASK = "notify-overdue-tasks";
const DUE_SOON_SWEEP_TASK = "notify-due-soon-tasks";

const isOverdueSweep = (event) => event?.task === OVERDUE_SWEEP_TASK && !event.httpMethod;

const INTERNAL_ROUTES = {
    "/internal/create-task": "internalCreateTask",
};

const ACTION_ROUTES = {
    GET: {
        'upload-url': 'getUploadUrl',
        'view-url': 'getViewUrl',
        'checklist': 'getChecklistItems',
        'checklist-templates': 'getChecklistTemplates',
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

        if (isOverdueSweep(event)) {
            return await controller.runOverdueSweep(event);
        }

        if (event?.task === DUE_SOON_SWEEP_TASK && !event.httpMethod) {
            return await controller.runDueSoonSweep(event);
        }

        const path = event.path || "";
        for (const [suffix, methodName] of Object.entries(INTERNAL_ROUTES)) {
            if (path.endsWith(suffix)) {
                return await controller[methodName](event);
            }
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
        // Nobody reads the answer to a scheduled run, so a failed sweep has to fail the invocation.
        if (isOverdueSweep(event)) {
            throw error;
        }
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
