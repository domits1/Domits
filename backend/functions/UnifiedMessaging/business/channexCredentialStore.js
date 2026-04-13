import {
  SecretsManagerClient,
  CreateSecretCommand,
  PutSecretValueCommand,
  GetSecretValueCommand,
  DescribeSecretCommand,
} from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "eu-north-1";
const SECRET_PREFIX = process.env.CHANNEX_SECRET_PREFIX || "domits/channex";

const secrets = new SecretsManagerClient({ region: REGION });

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

export default class ChannexCredentialStore {
  buildSecretName({ userId, integrationAccountId }) {
    return `${SECRET_PREFIX}/${userId}/${integrationAccountId}`;
  }

  async ensureSecret({ userId, integrationAccountId, payload }) {
    const secretName = this.buildSecretName({ userId, integrationAccountId });

    try {
      await secrets.send(new DescribeSecretCommand({ SecretId: secretName }));

      await secrets.send(
        new PutSecretValueCommand({
          SecretId: secretName,
          SecretString: JSON.stringify(payload),
        })
      );

      return secretName;
    } catch (error) {
      if (!isMissingSecretError(error)) throw error;

      await secrets.send(
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

    const result = await secrets.send(
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

    await secrets.send(
      new PutSecretValueCommand({
        SecretId: credentialsRef,
        SecretString: JSON.stringify(payload),
      })
    );

    return credentialsRef;
  }
}
