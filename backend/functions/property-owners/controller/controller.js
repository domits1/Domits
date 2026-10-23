import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import { ForbiddenException } from "../util/exception/forbiddenException.js";
import { GENERIC_ERROR_MESSAGE, respond } from "../util/http/response.js";

const OWNER_MANAGER_GROUPS = Object.freeze(["Host", "Admin"]);
const FORBIDDEN_MESSAGE = "You must be a Host or Admin to manage property owners.";
const INVALID_JSON_MESSAGE = "Request body must be valid JSON.";

const readAuthorizationHeader = (event) => event.headers?.Authorization || event.headers?.authorization;

const parseBody = (body) => {
  if (body === undefined || body === null) {
    throw new BadRequestException(INVALID_JSON_MESSAGE);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new BadRequestException(INVALID_JSON_MESSAGE);
  }
};

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

  async createOwner(event) {
    try {
      const hostId = await this.authorize(event);
      const body = parseBody(event.body);
      return respond(201, await this.service.createOwner(hostId, body));
    } catch (error) {
      return this.handleError(error);
    }
  }

  async setShares(event) {
    try {
      const hostId = await this.authorize(event);
      const body = parseBody(event.body);
      return respond(200, await this.service.setShares(hostId, body));
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateOwner(event) {
    try {
      const hostId = await this.authorize(event);
      const body = parseBody(event.body);
      return respond(200, await this.service.updateOwner(hostId, event.queryStringParameters?.id, body));
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
