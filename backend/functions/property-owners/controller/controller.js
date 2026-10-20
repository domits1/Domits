import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import { ForbiddenException } from "../util/exception/forbiddenException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

const OWNER_MANAGER_GROUPS = Object.freeze(["Host", "Admin"]);
const FORBIDDEN_MESSAGE = "You must be a Host or Admin to manage property owners.";
const GENERIC_ERROR_MESSAGE = "Something went wrong, please contact support.";

const readAuthorizationHeader = (event) => event.headers?.Authorization || event.headers?.authorization;

const respond = (statusCode, body) => ({
  statusCode,
  headers: responseHeaders,
  body: JSON.stringify(body),
});

const isClientError = (error) =>
  Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 500;

export class Controller {
  constructor({ service = new Service(), authManager = new AuthManager() } = {}) {
    this.service = service;
    this.authManager = authManager;
  }

  async authorize(event) {
    const { userId, role } = await this.authManager.getUser(readAuthorizationHeader(event));
    if (!OWNER_MANAGER_GROUPS.includes(role)) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }
    return userId;
  }

  async listOwners(event) {
    try {
      const hostId = await this.authorize(event);
      return respond(200, await this.service.listOwners(hostId));
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getOwner(event) {
    try {
      const hostId = await this.authorize(event);
      return respond(200, await this.service.getOwner(hostId, event.queryStringParameters?.id));
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    if (isClientError(error)) {
      return respond(error.statusCode, { message: error.message });
    }
    console.error(error);
    return respond(500, { message: GENERIC_ERROR_MESSAGE });
  }
}
