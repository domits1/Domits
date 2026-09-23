import WhatsAppProviderAdapter from "./whatsappProviderAdapter.js";
import { HttpError } from "../util/httpErrors.js";

export const createDefaultProviderAdapters = () => ({
  WHATSAPP: new WhatsAppProviderAdapter(),
});

export const resolveProviderAdapter = (adapters, platform) => {
  const adapter = adapters?.[platform];
  if (!adapter) {
    throw new HttpError(400, `Unsupported messaging provider: ${platform}`, "UNSUPPORTED_PROVIDER");
  }
  return adapter;
};
