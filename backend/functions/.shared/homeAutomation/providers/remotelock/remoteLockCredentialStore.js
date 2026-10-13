import IntegrationCredentialStore, {
  createSecretsClient,
} from "../../../channelManagement/providers/integrationCredentialStore.js";

const REGION = process.env.AWS_REGION || "eu-north-1";

// Secret name: <prefix>/<userId>/<integrationAccountId>. The prefix is read when the store is built, so a test
// (or a Lambda environment) can change it, and a test can pass its own secrets client.
export default class RemoteLockCredentialStore extends IntegrationCredentialStore {
  constructor({
    secretPrefix = process.env.REMOTELOCK_SECRET_PREFIX || "domits/remotelock",
    secrets = createSecretsClient(REGION),
  } = {}) {
    super({ secretPrefix, secrets });
  }
}
