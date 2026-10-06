import Database from "database";
import { ChannelIntegrationAccount } from "database/models/unified/integrations/ChannelIntegrationAccount";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const WHATSAPP_CHANNEL = "WHATSAPP";
const DISCONNECTED_STATUSES = new Set(["DISCONNECTED", "NOT CONNECTED"]);

const cleanText = (value) => String(value || "").trim();

const isConnectedAccount = (account) =>
  Boolean(cleanText(account?.externalAccountId)) &&
  !DISCONNECTED_STATUSES.has(cleanText(account?.status).toUpperCase());

const resolvePhoneNumber = (secret, account) => {
  const selectedPhoneNumber = cleanText(secret?.selectedPhoneNumber);
  if (selectedPhoneNumber) {
    return selectedPhoneNumber;
  }

  const selectedPhoneNumberId = cleanText(secret?.selectedPhoneNumberId) || cleanText(account?.externalAccountId);
  const selectableNumbers = Array.isArray(secret?.selectableNumbers) ? secret.selectableNumbers : [];
  const selected = selectableNumbers.find((item) => cleanText(item?.phoneNumberId) === selectedPhoneNumberId);
  return cleanText(selected?.phoneNumber);
};

export class WebsiteHostWhatsAppRepository {
  constructor({ secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || "eu-north-1" }) } = {}) {
    this.secretsClient = secretsClient;
  }

  async findConnectedAccountByUserId(userId) {
    const normalizedUserId = cleanText(userId);
    if (!normalizedUserId) {
      return null;
    }

    const client = await Database.getInstance();
    const accounts = await client.getRepository(ChannelIntegrationAccount).find({
      where: { userId: normalizedUserId, channel: WHATSAPP_CHANNEL },
      order: { updatedAt: "DESC" },
    });

    const newest = accounts[0] || null;
    return isConnectedAccount(newest) ? newest : null;
  }

  async readPhoneNumber(account) {
    const credentialsRef = cleanText(account?.credentialsRef);
    if (!credentialsRef) {
      return "";
    }

    const result = await this.secretsClient.send(new GetSecretValueCommand({ SecretId: credentialsRef }));
    let secret = null;
    try {
      secret = JSON.parse(result?.SecretString || "null");
    } catch {
      secret = null;
    }

    return resolvePhoneNumber(secret, account);
  }
}

export default WebsiteHostWhatsAppRepository;
