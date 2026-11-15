import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const readKey = (secretString) => {
  const text = String(secretString ?? "").trim();
  if (text.startsWith("{")) {
    return String(JSON.parse(text).subscriptionKey ?? "").trim();
  }
  return text;
};

export class TruviSecretRepository {
  constructor({ secretName, client = new SecretsManagerClient({ region: "eu-north-1" }) }) {
    this.secretName = secretName;
    this.client = client;
    this.cachedKey = null;
  }

  async getSubscriptionKey() {
    if (this.cachedKey) {
      return this.cachedKey;
    }
    const response = await this.client.send(new GetSecretValueCommand({ SecretId: this.secretName }));
    const key = readKey(response?.SecretString);
    if (!key) {
      throw new Error("The Truvi secret has no subscription key");
    }
    this.cachedKey = key;
    return key;
  }
}

export default TruviSecretRepository;
