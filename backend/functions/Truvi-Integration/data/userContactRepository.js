import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const USER_INFO_FUNCTION = "GetUserInfo";

const attributeOf = (attributes, name) => attributes.find((attribute) => attribute?.Name === name)?.Value || "";

export class UserContactRepository {
  constructor({ client = new LambdaClient({ region: "eu-north-1" }) } = {}) {
    this.client = client;
    this.cache = new Map();
  }

  async getGuestEmail(userId) {
    return (await this.#getUser(userId))?.email || null;
  }

  async getHost(userId) {
    return this.#getUser(userId);
  }

  async #getUser(userId) {
    if (!userId) {
      return null;
    }
    if (!this.cache.has(userId)) {
      this.cache.set(userId, this.#fetchUser(userId));
    }
    return this.cache.get(userId);
  }

  async #fetchUser(userId) {
    const response = await this.client.send(
      new InvokeCommand({ FunctionName: USER_INFO_FUNCTION, Payload: JSON.stringify({ UserId: userId }) })
    );
    const result = JSON.parse(new TextDecoder("utf-8").decode(response.Payload));
    if (result?.statusCode !== 200) {
      throw new Error(`GetUserInfo returned status ${result?.statusCode}`);
    }
    const attributes = JSON.parse(result.body)?.[0]?.Attributes || [];
    const fullName = [attributeOf(attributes, "given_name"), attributeOf(attributes, "family_name")].filter(Boolean).join(" ");
    return {
      email: attributeOf(attributes, "email") || null,
      name: attributeOf(attributes, "name") || fullName || null,
    };
  }
}

export default UserContactRepository;
