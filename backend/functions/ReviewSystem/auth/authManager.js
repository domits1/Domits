import { UnauthorizedException } from "../util/exception/unauthorizedException.js";

export class AuthManager {
  getUser(event) {
    const sub = event.requestContext?.authorizer?.claims?.sub;

    if (typeof sub !== "string" || !sub.trim()) {
      throw new UnauthorizedException("Verified authorization context is required.");
    }

    return { userId: sub };
  }
}
