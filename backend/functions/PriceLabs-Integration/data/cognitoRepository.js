export class CognitoRepository {
  async getHostId(event) {
    const claims =
      event?.requestContext?.authorizer?.claims ||
      event?.requestContext?.authorizer?.jwt?.claims;

    const sub = claims?.sub;
    if (!sub) throw Object.assign(new Error("Unauthorized — missing Cognito sub"), { status: 401 });
    return sub;
  }
}
