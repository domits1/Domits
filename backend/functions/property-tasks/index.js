const INTERNAL_ROUTES = {
    "/internal/create-task": "internalCreateTask",
};

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
