import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class Controller {
    constructor() {
        this.service = new Service();
        this.authManager = new AuthManager();
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

    async acceptInvite(event) {
        try {
            const { userId, email } = await this.authManager.getUser(event.headers?.Authorization);
            const token = event.queryStringParameters?.token;
            const result = await this.service.acceptInvite(token, userId, email);
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
