import { UploadService } from "../business/service/uploadService.js";
import { AuthManager } from "../auth/authManager.js";
import { ForbiddenException } from "../util/exception/forbiddenException.js";
import { errorResponse, respond } from "../util/http/response.js";

const DOCUMENT_MANAGER_GROUPS = Object.freeze(["Host", "Admin"]);
const FORBIDDEN_MESSAGE = "You must be a Host or Admin to manage documents.";

const readAuthorizationHeader = (event) => event.headers?.Authorization || event.headers?.authorization;

export class Controller {
  constructor({ uploadService = new UploadService(), authManager = new AuthManager() } = {}) {
    this.uploadService = uploadService;
    this.authManager = authManager;
  }

  async authorize(event) {
    const { userId, role } = await this.authManager.getUser(readAuthorizationHeader(event));
    if (DOCUMENT_MANAGER_GROUPS.includes(role)) {
      return userId;
    }
    throw new ForbiddenException(FORBIDDEN_MESSAGE);
  }

  async getUploadUrl(event) {
    try {
      const hostId = await this.authorize(event);
      const { fileType, fileSize } = event.queryStringParameters ?? {};
      return respond(200, await this.uploadService.createUploadUrl(hostId, fileType, fileSize));
    } catch (error) {
      return errorResponse(error);
    }
  }
}
