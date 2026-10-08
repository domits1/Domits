import { UnauthorizedException } from "../util/exception/unauthorizedException.js";

export class AuthManager {
  getUser(event) {
    // API Gateway verifies the token before passing the caller identity to Lambda.
    const sub = event.requestContext?.authorizer?.claims?.sub;

    if (typeof sub !== "string" || !sub.trim()) {
      throw new UnauthorizedException("Verified authorization context is required.");
    }

    const username = event.requestContext.authorizer.claims["cognito:username"];
    return { userId: sub, username };
  }
}
