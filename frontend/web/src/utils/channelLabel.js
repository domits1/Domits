import { OTA_DISPLAY_NAMES } from "./otaDisplayName.js";

export const resolveChannelLabel = ({ platform, bookingSource } = {}) => {
  const normalizedPlatform = String(platform || "").toUpperCase();
  if (!normalizedPlatform || normalizedPlatform === "DOMITS") return null;
  if (normalizedPlatform === "WHATSAPP") return "WhatsApp";
  if (normalizedPlatform === "CHANNEX") {
    const source = String(bookingSource || "").trim();
    return OTA_DISPLAY_NAMES[source] || source || "Channex";
  }
  return normalizedPlatform;
};
