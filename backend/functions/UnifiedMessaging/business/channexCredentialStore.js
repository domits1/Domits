import IntegrationCredentialStore, { createSecretsClient } from "./integrationCredentialStore.js";

const REGION = process.env.AWS_REGION || "eu-north-1";
const SECRET_PREFIX = process.env.CHANNEX_SECRET_PREFIX || "domits/channex";

const secrets = createSecretsClient(REGION);

export default class ChannexCredentialStore extends IntegrationCredentialStore {
  constructor() {
    super({ secretPrefix: SECRET_PREFIX, secrets });
  }
}
