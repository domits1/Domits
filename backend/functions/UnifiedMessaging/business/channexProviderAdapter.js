import IntegrationAccountRepository from "../.shared/integrations/repositories/integrationAccountRepository.js";
import ChannexCredentialStore from "../.shared/channelManagement/providers/channex/credentialStore.js";
import ChannexProviderClient from "../.shared/channelManagement/providers/channex/providerClient.js";
import { CHANNEX_ARI_OUTBOX_DEFAULTS } from "../.shared/channelManagement/utils/channexAriOutboxConstants.js";

const badRequest = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

export default class ChannexProviderAdapter {
  constructor({
    integrationAccounts = new IntegrationAccountRepository(),
    credentialStore = new ChannexCredentialStore(),
    providerClient = new ChannexProviderClient(),
  } = {}) {
    this.integrationAccounts = integrationAccounts;
    this.credentialStore = credentialStore;
    this.providerClient = providerClient;
  }

  async sendMessage({ integrationAccountId, externalThreadId, content, attachments }) {
    const integration = await this.integrationAccounts.getById(integrationAccountId);
    if (!integration) {
      throw badRequest("Channex integration account not found", "CHANNEX_INTEGRATION_NOT_FOUND");
    }

    const credentials = await this.credentialStore.readSecretOrNull(integration.credentialsRef);
    if (!credentials?.apiKey) {
      throw badRequest("Channex credentials are missing. Reconnect required.", "CHANNEX_RECONNECT_REQUIRED");
    }

    if (!externalThreadId) {
      throw badRequest("Missing externalThreadId for Channex send", "CHANNEX_THREAD_ID_REQUIRED");
    }

    if (Array.isArray(attachments) && attachments.length > 0) {
      throw badRequest("Channex does not support sending attachments yet.", "CHANNEX_ATTACHMENTS_UNSUPPORTED");
    }

    const result = await this.providerClient.sendMessage(
      { apiKey: credentials.apiKey },
      { externalThreadId, text: content },
      { requestTimeoutMs: CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS }
    );

    if (!result?.success) {
      throw badRequest(result?.errorMessage || "Channex message send failed", result?.errorCode);
    }

    return {
      accepted: true,
      mode: "live",
      channel: "CHANNEX",
      integrationAccountId,
      externalThreadId,
      providerMessageId: result.providerMessageId,
      text: content || "",
    };
  }
}
