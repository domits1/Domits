import WhatsAppProviderAdapter from "./whatsappProviderAdapter.js";
import ChannexProviderAdapter from "./channexProviderAdapter.js";
import { HttpError } from "../util/httpErrors.js";

export const createDefaultProviderAdapters = () => ({
  WHATSAPP: new WhatsAppProviderAdapter(),
  CHANNEX: new ChannexProviderAdapter(),
});

export const resolveProviderAdapter = (adapters, platform) => {
  const adapter = adapters?.[platform];
  if (!adapter) {
    throw new HttpError(400, `Unsupported messaging provider: ${platform}`, "UNSUPPORTED_PROVIDER");
  }
  return adapter;
};
