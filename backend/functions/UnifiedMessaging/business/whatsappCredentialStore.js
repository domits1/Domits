import {
  SecretsManagerClient,
  CreateSecretCommand,
  PutSecretValueCommand,
  GetSecretValueCommand,
  DescribeSecretCommand,
} from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "eu-north-1";
const SECRET_PREFIX = process.env.WHATSAPP_SECRET_PREFIX || "domits/whatsapp";

const secrets = new SecretsManagerClient({ region: REGION });

const parseSecretJson = (value) => {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export default class WhatsAppCredentialStore {
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
      const message = String(error?.name || error?.Code || error?.message || "");

      const notFound =
        message.includes("ResourceNotFoundException") ||
        message.includes("NotFound") ||
        message.includes("not found");

      if (!notFound) throw error;

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