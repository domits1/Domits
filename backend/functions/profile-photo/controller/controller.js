import { uploadProfilePhoto } from "../business/service/photoService.js";
import { AuthManager } from "../auth/authManager.js";
import { BadRequestException } from "../.shared/util/exception/badRequestException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class Controller {
    constructor() {
        this.authManager = new AuthManager();
    }

    async uploadPhoto(event) {
        try {
            const username = await this.authManager.getUsername(event.headers?.Authorization);
            const { image } = JSON.parse(event.body || "{}");
            if (!image) {
                throw new BadRequestException("image is required.");
            }
            const result = await uploadProfilePhoto(username, image);
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
