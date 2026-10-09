import { getTasks, createTask, updateTask, deleteTask, getUploadUrl, getViewUrl, escalateTask } from "../business/service/taskService.js";
import {
    getChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
} from "../business/service/taskChecklistService.js";
import { resolveEffectiveHostId } from "../business/service/pomService.js";
import { AuthManager } from "../auth/authManager.js";
import { UnauthorizedException } from "../util/exception/unauthorizedException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class Controller {
    constructor() {
        this.authManager = new AuthManager();
    }

    async resolveHost(event) {
        const { username, role } = await this.authManager.getUser(event.headers?.Authorization);
        const asHostId = event.queryStringParameters?.asHostId || null;
        return await resolveEffectiveHostId(username, role, asHostId);
    }

    async getTasks(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const filters = { ...event.queryStringParameters };
            delete filters.asHostId;
            const tasks = await getTasks(effectiveHostId, filters);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(tasks) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async createTask(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const taskData = JSON.parse(event.body);
            const result = await createTask(effectiveHostId, taskData);
            return { statusCode: 201, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateTask(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const taskId = event.queryStringParameters?.id || event.pathParameters?.id;
            const updateData = JSON.parse(event.body);
            const result = await updateTask(effectiveHostId, taskId, updateData);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteTask(event) {
        try {
            const { effectiveHostId, isPOM } = await this.resolveHost(event);
            if (isPOM) throw new UnauthorizedException("Co-hosts cannot delete tasks.");
            const taskId = event.queryStringParameters?.id || event.pathParameters?.id;
            const result = await deleteTask(effectiveHostId, taskId);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getViewUrl(event) {
        try {
            await this.authManager.getHostId(event.headers?.Authorization);
            const { key } = event.queryStringParameters || {};
            if (!key) {
                return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ message: "key is required" }) };
            }
            const viewUrl = await getViewUrl(key);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify({ viewUrl }) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getUploadUrl(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const { fileName, fileType } = event.queryStringParameters || {};
            if (!fileName || !fileType) {
                return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ message: "fileName and fileType are required" }) };
            }
            const result = await getUploadUrl(effectiveHostId, fileName, fileType);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getChecklistItems(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const taskId = event.queryStringParameters?.taskId;
            if (!taskId) {
                return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ message: "taskId is required" }) };
            }
            const items = await getChecklistItems(effectiveHostId, taskId);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(items) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async createChecklistItem(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const body = JSON.parse(event.body);
            const { taskId, ...itemData } = body;
            if (!taskId) {
                return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ message: "taskId is required" }) };
            }
            const result = await createChecklistItem(effectiveHostId, taskId, itemData);
            return { statusCode: 201, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateChecklistItem(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const itemId = event.queryStringParameters?.id;
            const updateData = JSON.parse(event.body);
            const result = await updateChecklistItem(effectiveHostId, itemId, updateData);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async escalateTask(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const taskId = event.queryStringParameters?.id;
            const result = await escalateTask(effectiveHostId, taskId);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteChecklistItem(event) {
        try {
            const { effectiveHostId } = await this.resolveHost(event);
            const itemId = event.queryStringParameters?.id;
            const result = await deleteChecklistItem(effectiveHostId, itemId);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    handleError(error) {
        return {
            statusCode: error.statusCode || 500,
            headers: responseHeaders,
            body: JSON.stringify({
                message: error.message || "Something went wrong, please contact support."
            })
        };
    }
}
