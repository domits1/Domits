import { OTA_DISPLAY_NAMES } from "./otaDisplayName.js";

// The badge next to a conversation: Domits conversations get none, Channex ones show the OTA the booking came from.
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
