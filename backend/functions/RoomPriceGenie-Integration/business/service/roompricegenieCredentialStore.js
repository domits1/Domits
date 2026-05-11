import {
  SecretsManagerClient,
  CreateSecretCommand,
  DeleteSecretCommand,
  PutSecretValueCommand,
  GetSecretValueCommand,
  DescribeSecretCommand,
} from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "eu-north-1";
const SECRET_PREFIX = "domits/roompricegenie";

function isMissingSecretError(error) {
  return (
    error.name === "ResourceNotFoundException" ||
    error.name === "SecretNotFoundException"
  );
}

function parseJson(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

export default class RoomPriceGenieCredentialStore {
  constructor() {
    this.secrets = new SecretsManagerClient({ region: REGION });
  }

  _secretName(propertyId, type) {
    return `${SECRET_PREFIX}/${propertyId}/${type}`;
  }

  async _upsert(secretName, payload, description) {
    const json = JSON.stringify(payload);
    try {
      await this.secrets.send(new DescribeSecretCommand({ SecretId: secretName }));
      await this.secrets.send(new PutSecretValueCommand({ SecretId: secretName, SecretString: json }));
    } catch (err) {
      if (!isMissingSecretError(err)) throw err;
      await this.secrets.send(new CreateSecretCommand({ Name: secretName, Description: description, SecretString: json }));
    }
    return secretName;
  }

  async _read(secretRef) {
    if (!secretRef) return null;
    try {
      const res = await this.secrets.send(new GetSecretValueCommand({ SecretId: secretRef }));
      return parseJson(res?.SecretString);
    } catch (err) {
      if (isMissingSecretError(err)) return null;
      throw err;
    }
  }

  async _delete(secretRef) {
    if (!secretRef) return;
    try {
      await this.secrets.send(new DeleteSecretCommand({ SecretId: secretRef, ForceDeleteWithoutRecovery: true }));
    } catch (err) {
      if (!isMissingSecretError(err)) throw err;
    }
  }

  /**
   * Store the RPG client_secret for a property.
   * @returns {string} secretRef
   */
  async storeClientSecret(propertyId, clientSecret) {
    const name = this._secretName(propertyId, "client-secret");
    return this._upsert(name, { clientSecret }, `RPG client secret for property ${propertyId}`);
  }

  async getClientSecret(secretRef) {
    const data = await this._read(secretRef);
    return data?.clientSecret || null;
  }

  /**
   * Store RPG access_token + refresh_token for a property.
   * Called after every successful token request or refresh.
   * @returns {string} secretRef
   */
  async storeTokens(propertyId, accessToken, refreshToken) {
    const name = this._secretName(propertyId, "tokens");
    return this._upsert(name, { accessToken, refreshToken }, `RPG tokens for property ${propertyId}`);
  }

  async getTokens(secretRef) {
    return this._read(secretRef); // { accessToken, refreshToken }
  }

  /**
   * Delete all secrets for a property (on disconnect).
   */
  async deleteAll(propertyId) {
    await this._delete(this._secretName(propertyId, "client-secret"));
    await this._delete(this._secretName(propertyId, "tokens"));
  }
}
