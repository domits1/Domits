import {
  SecretsManagerClient,
  CreateSecretCommand,
  DeleteSecretCommand,
  PutSecretValueCommand,
  GetSecretValueCommand,
  DescribeSecretCommand,
} from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "eu-north-1";
const SECRET_PREFIX = process.env.WHATSAPP_SECRET_PREFIX || "domits/whatsapp";
const PENDING_CONNECT_PREFIX = process.env.WHATSAPP_PENDING_CONNECT_PREFIX || "domits/whatsapp-connect";

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

export default class WhatsAppCredentialStore {
  buildSecretName({ userId, integrationAccountId }) {
    return `${SECRET_PREFIX}/${userId}/${integrationAccountId}`;
  }

  buildPendingConnectSecretName(connectSessionId) {
    return `${PENDING_CONNECT_PREFIX}/${connectSessionId}`;
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

  async savePendingConnectState(connectSessionId, payload) {
    if (!connectSessionId) {
      throw new Error("Missing connectSessionId");
    }

    const secretName = this.buildPendingConnectSecretName(connectSessionId);

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

  async readPendingConnectState(connectSessionId) {
    if (!connectSessionId) return null;

    const secretName = this.buildPendingConnectSecretName(connectSessionId);
    return this.readSecretOrNull(secretName);
  }

  async deletePendingConnectState(connectSessionId) {
    if (!connectSessionId) return;

    const secretName = this.buildPendingConnectSecretName(connectSessionId);

    try {
      await secrets.send(
        new DeleteSecretCommand({
          SecretId: secretName,
          ForceDeleteWithoutRecovery: true,
        })
      );
    } catch (error) {
      if (isMissingSecretError(error)) return;
      throw error;
    }
  }
}
