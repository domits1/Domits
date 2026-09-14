import { getAuthenticatedUser } from "../auth/authContext.js";
import { CommunicationPreferencesService, normalizePersona } from "../business/service/service.js";
import { badRequest } from "../util/httpErrors.js";

const USER_ID_KEYS = ["userId", "user_id", "cognitoUserId", "sub"];

const hasUserIdParameter = (parameters = {}) =>
  Object.keys(parameters || {}).some((key) => USER_ID_KEYS.includes(key));

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

const getPersonaFromQuery = (event) => {
  const query = event?.queryStringParameters || {};
  if (!Object.prototype.hasOwnProperty.call(query, "persona")) {
    throw badRequest("persona query parameter is required.");
  }
  return normalizePersona(query.persona);
};

export class CommunicationPreferencesController {
  constructor({ service = new CommunicationPreferencesService() } = {}) {
    this.service = service;
  }

  async getPreferences(event) {
    if (
      hasUserIdParameter(event?.queryStringParameters) ||
      hasUserIdParameter(event?.pathParameters)
    ) {
      throw badRequest("userId must not be provided for communication preferences.");
    }

    const persona = getPersonaFromQuery(event);
    const authenticatedUser = getAuthenticatedUser(event);
    const preferences = await this.service.getPreferences(authenticatedUser.userId, persona);
    return { statusCode: 200, response: preferences };
  }

  async updatePreferences(event) {
    if (
      hasUserIdParameter(event?.queryStringParameters) ||
      hasUserIdParameter(event?.pathParameters)
    ) {
      throw badRequest("userId must not be provided for communication preferences.");
    }

    const persona = getPersonaFromQuery(event);
    const authenticatedUser = getAuthenticatedUser(event);
    const body = parseBody(event);
    const preferences = await this.service.savePreferences(authenticatedUser.userId, persona, body);
    return { statusCode: 200, response: preferences };
  }
}
