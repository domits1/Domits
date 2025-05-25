import {Service} from "../business/service/service.js";
import {AuthManager} from "../auth/authManager.js";
import {UnauthorizedException} from "../util/exception/unauthorizedException.js";
import {BadRequestException} from "../util/exception/badRequestException.js";

export class Controller {
    service;
    authManager;

    constructor() {
        this.service = new Service();
        this.authManager = new AuthManager();
    }

    async getUser(event) {
        try {
            if (!await this.authManager.userIsAuthorized(event.headers.Authorization)) {
                throw new UnauthorizedException("You are not authorized to perform this action.")
            }
            const id = event.queryStringParameters?.id;
            if (!id) {
                throw new BadRequestException("No id provided.");
            }
            return {
                statusCode: 200,
                body: JSON.stringify(await this.service.getUser(id))
            };
        } catch (error) {
            console.error(error.message);
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

}