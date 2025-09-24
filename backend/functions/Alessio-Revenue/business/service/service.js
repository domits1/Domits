import { Repository } from "../../data/repository.js";
import AuthManager from "../../auth/authManager.js";

export class Service {
    constructor() {
        this.repository = new Repository();
        this.authManager = new AuthManager();
    }

    async getRevenue(event) {
        const token = event.headers.Authorization;
        if (!token) {
            throw new Error("Authorization token is missing");
        }

        // Authenticate the token to get the Cognito user ID (sub)
        const { sub: cognitoUserId } = await this.authManager.authenticateUser(event.headers.Authorization);

        // Pass the Cognito user ID to the repository
        return await this.repository.getRevenue(cognitoUserId);
    }
}
