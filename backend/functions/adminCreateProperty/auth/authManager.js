import { UnauthorizedException } from "file:///var/task/util/constant/exception/unauthorizedException.js";

export class AuthManager {
    async authorizeGroupRequest(accessToken, requiredGroup) {
        if (!accessToken) {
            throw new UnauthorizedException("No authorization token provided.");
        }
        return "host-id-placeholder";
    }

    async userIsAuthorized(accessToken) {
        if (!accessToken) {
            throw new UnauthorizedException("No authorization token provided.");
        }
        return !!accessToken;
    }
}