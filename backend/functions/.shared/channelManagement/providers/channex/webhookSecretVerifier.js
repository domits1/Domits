import { createHash, timingSafeEqual } from "node:crypto";
import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const WEBHOOK_SECRET_HEADER = "x-channex-webhook-secret";
// Short enough that a rotated secret takes effect without a Lambda restart.
const SECRET_CACHE_MS = 5 * 60 * 1000;

// Stored as JSON like every other integration secret: {"webhookSecret": "..."}.
const parseWebhookSecret = (secretString) => {
  try {
    return JSON.parse(secretString)?.webhookSecret || null;
  } catch {
    return null;
  }
};

const findHeader = (headers, name) => {
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === name);
  return entry ? entry[1] : null;
};

// Hashing first gives both sides the same length, so timingSafeEqual cannot throw and the
// comparison does not reveal how long the secret is.
const sha256 = (value) => createHash("sha256").update(String(value)).digest();

export default class ChannexWebhookSecretVerifier {
  constructor({ secrets, secretName, now = Date.now }) {
    this.secrets = secrets;
    this.secretName = secretName;
    this.now = now;
    this.cachedSecret = null;
    this.cachedAtMs = 0;
  }

  async readSecret() {
    if (this.cachedSecret && this.now() - this.cachedAtMs < SECRET_CACHE_MS) {
      return this.cachedSecret;
    }

    const result = await this.secrets.send(new GetSecretValueCommand({ SecretId: this.secretName }));
    const secret = parseWebhookSecret(result?.SecretString);
    if (!secret) {
      throw new Error("Channex webhook secret is not configured.");
    }

    this.cachedSecret = secret;
    this.cachedAtMs = this.now();
    return secret;
  }

  async verify(headers) {
    const expected = await this.readSecret();
    const provided = findHeader(headers, WEBHOOK_SECRET_HEADER);
    if (!provided) return false;

    return timingSafeEqual(sha256(provided), sha256(expected));
  }
}
