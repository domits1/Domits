import IntegrationCredentialStore, { createSecretsClient } from "../integrationCredentialStore.js";

const REGION = process.env.AWS_REGION || "eu-north-1";
const SECRET_PREFIX = process.env.HOLIDU_SECRET_PREFIX || "domits/holidu";

const secrets = createSecretsClient(REGION);

export default class HoliduCredentialStore extends IntegrationCredentialStore {
  constructor() {
    super({ secretPrefix: SECRET_PREFIX, secrets });
  }
}
