import {UnauthorizedException} from "../util/exception/unauthorizedException.js";

export class AuthManager {

    async userIsAuthorized(accessToken) {
        if (!accessToken) {
            throw new UnauthorizedException("No authorization token provided.")
        }
        return !!accessToken;
    }
}