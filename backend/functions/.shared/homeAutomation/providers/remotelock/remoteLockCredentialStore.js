import IntegrationCredentialStore, {
  createSecretsClient,
} from "../../../channelManagement/providers/integrationCredentialStore.js";

const REGION = process.env.AWS_REGION || "eu-north-1";

// The characters AWS Secrets Manager allows in a name, without "/": a "/" in an id would move the secret into
// another path, and so under another account's name. The message names the field and never the value.
const SECRET_NAME_PART = /^[A-Za-z0-9_+=.@-]+$/;

const requireSecretNamePart = (value, label) => {
  if (typeof value !== "string" || !SECRET_NAME_PART.test(value)) {
    throw new Error(`${label} must be a non-empty string of letters, digits and _+=.@- only.`);
  }
  return value;
};

// Secret name: <prefix>/<userId>/<integrationAccountId>. The prefix is read when the store is built, so a test
// (or a Lambda environment) can change it, and a test can pass its own secrets client.
export default class RemoteLockCredentialStore extends IntegrationCredentialStore {
  constructor({
    secretPrefix = process.env.REMOTELOCK_SECRET_PREFIX || "domits/remotelock",
    secrets = createSecretsClient(REGION),
  } = {}) {
    super({ secretPrefix, secrets });
  }

  buildSecretName({ userId, integrationAccountId } = {}) {
    return super.buildSecretName({
      userId: requireSecretNamePart(userId, "userId"),
      integrationAccountId: requireSecretNamePart(integrationAccountId, "integrationAccountId"),
    });
  }
}
