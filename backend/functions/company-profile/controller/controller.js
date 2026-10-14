import { getAuthenticatedUser } from "../auth/authContext.js";
import { CompanyProfileService } from "../business/service/service.js";
import { badRequest } from "../util/httpErrors.js";

const parseBody = (event) => {
  if (!event?.body) {
    throw badRequest("Request body is required.");
  }

  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
};

export class CompanyProfileController {
  constructor({ service = new CompanyProfileService() } = {}) {
    this.service = service;
  }

  async getProfile(event) {
    const authenticatedUser = getAuthenticatedUser(event);
    const profile = await this.service.getCompanyProfile(authenticatedUser.userId);
    return { statusCode: 200, response: profile };
  }

  async updateProfile(event) {
    const authenticatedUser = getAuthenticatedUser(event);
    const body = parseBody(event);
    const profile = await this.service.updateCompanyProfile(authenticatedUser.userId, body);
    return { statusCode: 200, response: profile };
  }

  async createLogoUploadUrl(event) {
    const authenticatedUser = getAuthenticatedUser(event);
    const { fileType } = parseBody(event);
    const upload = await this.service.createLogoUploadUrl(authenticatedUser.userId, fileType);
    return { statusCode: 200, response: upload };
  }
}
