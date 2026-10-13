import IntegrationAccountRepository from "../.shared/integrations/repositories/integrationAccountRepository.js";
import ChannexCredentialStore from "../.shared/channelManagement/providers/channex/credentialStore.js";
import ChannexProviderClient from "../.shared/channelManagement/providers/channex/providerClient.js";

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

  async sendMessage({ integrationAccountId, externalThreadId, content }) {
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

    const result = await this.providerClient.sendMessage(
      { apiKey: credentials.apiKey },
      { externalThreadId, text: content }
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
