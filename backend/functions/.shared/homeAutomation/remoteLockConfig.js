import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { createSecretsClient } from "../channelManagement/providers/integrationCredentialStore.js";
import { RemoteLockOAuthClient } from "./providers/remotelock/remoteLockOAuthClient.js";

// Short enough that a rotated client secret takes effect without a Lambda restart.
const SECRET_CACHE_MS = 5 * 60 * 1000;

// Fixed text on purpose: whatever failed underneath (a bad URL, a secret that did not parse) can quote a value.
export class RemoteLockConfigError extends Error {
  constructor() {
    super("RemoteLock is not configured.");
    this.name = "RemoteLockConfigError";
  }
}

const isText = (value) => typeof value === "string" && value.trim().length > 0;

// Client id and redirect URI come from the Lambda environment, the client secret from Secrets Manager as
// {"clientSecret": "..."}. The redirect URI is never taken from a request.
export const createRemoteLockOAuthClientLoader = ({
  env = process.env,
  secrets = createSecretsClient(process.env.AWS_REGION || "eu-north-1"),
  now = Date.now,
} = {}) => {
  let cachedSecret = null;
  let cachedAt = 0;

  const readClientSecret = async (secretName) => {
    if (cachedSecret && now() - cachedAt < SECRET_CACHE_MS) return cachedSecret;
    const result = await secrets.send(new GetSecretValueCommand({ SecretId: secretName }));
    const clientSecret = JSON.parse(result?.SecretString)?.clientSecret;
    if (!isText(clientSecret)) throw new Error("missing");
    cachedSecret = clientSecret;
    cachedAt = now();
    return clientSecret;
  };

  return async () => {
    const clientId = env.REMOTELOCK_CLIENT_ID;
    const redirectUri = env.REMOTELOCK_REDIRECT_URI;
    const secretName = env.REMOTELOCK_CLIENT_SECRET_NAME;
    if (![clientId, redirectUri, secretName].every(isText)) throw new RemoteLockConfigError();

    try {
      return new RemoteLockOAuthClient({ clientId, clientSecret: await readClientSecret(secretName), redirectUri });
    } catch {
      throw new RemoteLockConfigError();
    }
  };
};
