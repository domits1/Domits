import { UnauthorizedException } from "../util/exception/unauthorizedException.js";
import { ForbiddenException } from "../util/exception/forbiddenException.js";
import { NotFoundException } from "../util/exception/notFoundException.js";
import { CognitoRepository } from "../data/cognitoRepository.js";
import { PropertyRepository } from "../data/propertyRepository.js";

export class AuthManager {
    constructor() {
        this.cognitoRepository = new CognitoRepository();
        this.propertyRepository = new PropertyRepository();
    }

    normalizeAccessToken(accessToken) {
        const token = String(accessToken || "").trim();
        if (!token) {
            throw new UnauthorizedException("No authorization token provided.");
        }
        return token.toLowerCase().startsWith("bearer ") ? token.slice(7).trim() : token;
    }

    async getAuthorizedUser(accessToken) {
        const normalizedToken = this.normalizeAccessToken(accessToken);
        try {
            return await this.cognitoRepository.getUserByAccessToken(normalizedToken);
        } catch (error) {
            const unauthorized = new UnauthorizedException("You must be logged in.");
            unauthorized.cause = error;
            throw unauthorized;
        }
    }

    assertHostGroup(user) {
        const groupAttribute = Array.isArray(user?.UserAttributes)
            ? user.UserAttributes.find((attribute) => attribute?.Name === "custom:group")
            : null;

        if (groupAttribute?.Value !== "Host") {
            throw new ForbiddenException("You must be a Host.");
        }
    }

    async userIsAuthorized(accessToken) {
        const user = await this.getAuthorizedUser(accessToken);
        this.assertHostGroup(user);
        return user;
    }

    async authorizePropertyOwner(accessToken, propertyId) {
        const user = await this.userIsAuthorized(accessToken);
        return await this.authorizePropertyOwnerForUser(user, propertyId);
    }

    async authorizePropertyOwnerForUser(user, propertyId) {
        const ownerId = await this.propertyRepository.getHostIdByPropertyId(propertyId);
        if (!ownerId) {
            throw new NotFoundException("Property not found.");
        }
        if (ownerId !== user.Username) {
            throw new ForbiddenException("You must be the owner of this property.");
        }

        return user.Username;
    }
}