const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";
const HOST_WHATSAPP_PROMISE_CACHE = new Map();

const EMPTY_WEBSITE_HOST_WHATSAPP = Object.freeze({
  connected: false,
  displayName: "",
  phoneNumber: "",
  phoneNumberDigits: "",
  isAvailable: false,
});

const cleanText = (value) => String(value || "").trim();
const normalizePhoneNumberDigits = (value) => cleanText(value).replaceAll(/\D+/g, "");

export const getEmptyWebsiteHostWhatsApp = () => ({
  ...EMPTY_WEBSITE_HOST_WHATSAPP,
});

const normalizeWebsiteHostWhatsApp = (integration) => {
  const normalizedPhoneNumber = cleanText(integration?.phoneNumber);
  const phoneNumberDigits = normalizePhoneNumberDigits(normalizedPhoneNumber);
  const normalizedStatus = cleanText(integration?.status).toUpperCase();
  const connected =
    Boolean(cleanText(integration?.externalAccountId)) &&
    normalizedStatus !== "DISCONNECTED" &&
    normalizedStatus !== "NOT CONNECTED";

  return {
    connected,
    displayName: cleanText(integration?.displayName),
    phoneNumber: normalizedPhoneNumber,
    phoneNumberDigits,
    isAvailable: connected && Boolean(phoneNumberDigits),
  };
};

export const fetchWebsiteHostWhatsApp = async (hostId) => {
  const normalizedHostId = cleanText(hostId);
  if (!normalizedHostId) {
    return getEmptyWebsiteHostWhatsApp();
  }

  if (!HOST_WHATSAPP_PROMISE_CACHE.has(normalizedHostId)) {
    HOST_WHATSAPP_PROMISE_CACHE.set(
      normalizedHostId,
      fetch(`${UNIFIED_API}/integrations?userId=${encodeURIComponent(normalizedHostId)}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            return getEmptyWebsiteHostWhatsApp();
          }

          const payload = await response.json().catch(() => []);
          const integrations = Array.isArray(payload) ? payload : [];
          const whatsappIntegration =
            integrations.find((integration) => cleanText(integration?.channel).toUpperCase() === "WHATSAPP") || null;

          return whatsappIntegration
            ? normalizeWebsiteHostWhatsApp(whatsappIntegration)
            : getEmptyWebsiteHostWhatsApp();
        })
        .catch(() => getEmptyWebsiteHostWhatsApp())
    );
  }

  return HOST_WHATSAPP_PROMISE_CACHE.get(normalizedHostId);
};
