import { getTasks, createTask, updateTask, deleteTask } from "../business/service/taskService.js";
import { AuthManager } from "../auth/authManager.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class Controller {
    constructor() {
        this.authManager = new AuthManager();
    }

    async getTasks(event) {
        try {
            const hostId = await this.authManager.getHostId(event.headers?.Authorization);
            const filters = event.queryStringParameters || {};

            const tasks = await getTasks(hostId, filters);
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(tasks)
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async createTask(event) {
        try {
            const hostId = await this.authManager.getHostId(event.headers?.Authorization);
            const taskData = JSON.parse(event.body);

            const result = await createTask(hostId, taskData);
            return {
                statusCode: 201,
                headers: responseHeaders,
                body: JSON.stringify(result)
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateTask(event) {
        try {
            const hostId = await this.authManager.getHostId(event.headers?.Authorization);
            const taskId = event.pathParameters?.id;
            const updateData = JSON.parse(event.body);

            const result = await updateTask(hostId, taskId, updateData);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteTask(event) {
        try {
            const hostId = await this.authManager.getHostId(event.headers?.Authorization);
            const taskId = event.pathParameters?.id;

            const result = await deleteTask(hostId, taskId);
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