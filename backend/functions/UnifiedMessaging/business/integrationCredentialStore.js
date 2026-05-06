import {
  SecretsManagerClient,
  CreateSecretCommand,
  PutSecretValueCommand,
  GetSecretValueCommand,
  DescribeSecretCommand,
} from "@aws-sdk/client-secrets-manager";

export const createSecretsClient = (region) => new SecretsManagerClient({ region });

const parseSecretJson = (value) => {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const isMissingSecretError = (error) => {
  const message = String(error?.name || error?.Code || error?.message || "");

  return (
    message.includes("ResourceNotFoundException") ||
    message.includes("NotFound") ||
    message.includes("not found")
  );
};

export default class IntegrationCredentialStore {
  constructor({ secretPrefix, secrets }) {
    this.secretPrefix = secretPrefix;
    this.secrets = secrets;
  }

  buildSecretName({ userId, integrationAccountId }) {
    return `${this.secretPrefix}/${userId}/${integrationAccountId}`;
  }

  async ensureSecret({ userId, integrationAccountId, payload }) {
    const secretName = this.buildSecretName({ userId, integrationAccountId });

    try {
      await this.secrets.send(new DescribeSecretCommand({ SecretId: secretName }));

      await this.secrets.send(
        new PutSecretValueCommand({
          SecretId: secretName,
          SecretString: JSON.stringify(payload),
        })
      );

      return secretName;
    } catch (error) {
      if (!isMissingSecretError(error)) throw error;

      await this.secrets.send(
        new CreateSecretCommand({
          Name: secretName,
          SecretString: JSON.stringify(payload),
        })
      );

      return secretName;
    }
  }

  async readSecret(credentialsRef) {
    if (!credentialsRef) return null;

    const result = await this.secrets.send(
      new GetSecretValueCommand({
        SecretId: credentialsRef,
      })
    );

    return parseSecretJson(result?.SecretString || null);
  }

  async readSecretOrNull(credentialsRef) {
    if (!credentialsRef) return null;

    try {
      return await this.readSecret(credentialsRef);
    } catch (error) {
      if (isMissingSecretError(error)) return null;
      throw error;
    }
  }

  async writeSecret(credentialsRef, payload) {
    if (!credentialsRef) {
      throw new Error("Missing credentialsRef");
    }

    await this.secrets.send(
      new PutSecretValueCommand({
        SecretId: credentialsRef,
        SecretString: JSON.stringify(payload),
      })
    );

    return credentialsRef;
  }
}
