import MessageService from "../business/messageService.js";
import { getAuthenticatedUser } from "../auth/authContext.js";
import { badRequest, forbidden } from "../util/httpErrors.js";

const parseBody = (event) => {
  if (!event?.body) return {};

  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
};

class MessageController {
  constructor() {
    this.messageService = new MessageService();
  }

  async sendMessage(event) {
    const authenticatedUser = getAuthenticatedUser(event);
    const body = parseBody(event);
    return await this.messageService.sendMessage(body, authenticatedUser);
  }

  async getThreads(event) {
    const authenticatedUser = getAuthenticatedUser(event);
    const requestedUserId = event.queryStringParameters?.userId;
    if (requestedUserId && String(requestedUserId) !== String(authenticatedUser.userId)) {
      throw forbidden("userId does not match the authenticated user.");
    }
    return await this.messageService.getThreads(authenticatedUser);
  }

  async getMessages(event) {
    const authenticatedUser = getAuthenticatedUser(event);
    const threadId = event.queryStringParameters?.threadId;
    return await this.messageService.getMessages(threadId, authenticatedUser);
  }
}

export default MessageController;
