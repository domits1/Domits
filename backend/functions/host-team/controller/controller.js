import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import { ForbiddenException } from "../util/exception/forbiddenException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

const ROLE_MANAGER_GROUPS = ["Host", "Admin"];

export class Controller {
    constructor({ service = new Service(), authManager = new AuthManager() } = {}) {
        this.service = service;
        this.authManager = authManager;
    }

    async getTeamMembers(event) {
        try {
            const { userId } = await this.authManager.getUser(event.headers?.Authorization);
            const members = await this.service.getTeamMembers(userId);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(members) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async inviteMember(event) {
        try {
            const { userId, email } = await this.authManager.getUser(event.headers?.Authorization);
            const { email: inviteEmail, role } = JSON.parse(event.body || "{}");
            const result = await this.service.inviteMember(userId, email, inviteEmail, role);
            return { statusCode: 201, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async removeMember(event) {
        try {
            const { userId } = await this.authManager.getUser(event.headers?.Authorization);
            const memberId = event.queryStringParameters?.id;
            const result = await this.service.removeMember(userId, memberId);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getMemberships(event) {
        try {
            const { userId } = await this.authManager.getUser(event.headers?.Authorization);
            const memberships = await this.service.getMemberships(userId);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(memberships) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async acceptInvite(event) {
        try {
            const { userId, email, role } = await this.authManager.getUser(event.headers?.Authorization);
            const token = event.queryStringParameters?.token;
            const result = await this.service.acceptInvite(token, userId, email, role);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateMemberRole(event) {
        try {
            const { userId, role: callerRole } = await this.authManager.getUser(event.headers?.Authorization);
            if (!ROLE_MANAGER_GROUPS.includes(callerRole)) {
                throw new ForbiddenException("You must be a Host or Admin to edit team member roles.");
            }
            const memberId = event.queryStringParameters?.id;
            const { role } = JSON.parse(event.body || "{}");
            const result = await this.service.updateMemberRole(userId, memberId, role);
            return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    handleError(error) {
        return {
            statusCode: error.statusCode || 500,
            headers: responseHeaders,
            body: JSON.stringify({ message: error.message || "Something went wrong, please contact support." })
        };
    }
}
