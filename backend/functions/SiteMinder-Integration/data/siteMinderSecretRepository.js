import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

// One PMS-level login for all hotels, kept in Secrets Manager as {"username": "...", "password": "..."}.
export class SiteMinderSecretRepository {
  constructor({ secretName, client = new SecretsManagerClient({ region: "eu-north-1" }) }) {
    this.secretName = secretName;
    this.client = client;
    this.cached = null;
  }

  async getCredentials() {
    if (this.cached) {
      return this.cached;
    }
    const response = await this.client.send(new GetSecretValueCommand({ SecretId: this.secretName }));
    let secret;
    try {
      secret = JSON.parse(String(response?.SecretString ?? ""));
    } catch {
      throw new Error("The SiteMinder secret is not JSON");
    }
    const username = String(secret?.username ?? "").trim();
    const password = String(secret?.password ?? "");
    if (!username || !password) {
      throw new Error("The SiteMinder secret needs a username and a password");
    }
    this.cached = { username, password };
    return this.cached;
  }
}

export default SiteMinderSecretRepository;
