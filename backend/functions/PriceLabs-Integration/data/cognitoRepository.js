export class CognitoRepository {
  async getHostId(event) {
    const claims =
      event?.requestContext?.authorizer?.claims ||
      event?.requestContext?.authorizer?.jwt?.claims;

    const sub = claims?.sub;
    if (!sub) throw { status: 401, message: "Unauthorized — missing Cognito sub" };
    return sub;
  }
}
