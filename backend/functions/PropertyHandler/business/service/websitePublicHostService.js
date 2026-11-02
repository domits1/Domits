import { CognitoRepository } from "../../data/repository/cognitoRepository.js";
import { WebsiteHostWhatsAppRepository } from "../../data/repository/websiteHostWhatsAppRepository.js";

const PUBLIC_HOST_CACHE_TTL_MS = 5 * 60 * 1000;

const cleanText = (value) => String(value || "").trim();
const toPhoneDigits = (value) => cleanText(value).replaceAll(/\D+/g, "");

const PROFILE_IMAGE_ATTRIBUTES = [
  "picture",
  "profileImage",
  "profile_image",
  "custom:profileImage",
  "custom:profile_image",
];

export const buildEmptyPublicWebsiteHost = () => ({
  displayName: "",
  profileImage: "",
  whatsapp: {
    isAvailable: false,
    phoneNumber: "",
    phoneNumberDigits: "",
  },
});

const readAttribute = (attributes, names) => {
  for (const name of names) {
    const value = cleanText(attributes.get(name));
    if (value) {
      return value;
    }
  }
  return "";
};

export class WebsitePublicHostService {
  constructor({
    cognitoRepository = new CognitoRepository(),
    whatsAppRepository = new WebsiteHostWhatsAppRepository(),
    cacheTtlMs = PUBLIC_HOST_CACHE_TTL_MS,
    now = () => Date.now(),
  } = {}) {
    this.cognitoRepository = cognitoRepository;
    this.whatsAppRepository = whatsAppRepository;
    this.cacheTtlMs = cacheTtlMs;
    this.now = now;
    this.cache = new Map();
  }

  async loadPublicHost(hostId) {
    const normalizedHostId = cleanText(hostId);
    if (!normalizedHostId) {
      return buildEmptyPublicWebsiteHost();
    }

    const cached = this.cache.get(normalizedHostId);
    if (cached && cached.expiresAt > this.now()) {
      return structuredClone(cached.host);
    }

    try {
      const [profile, whatsapp] = await Promise.all([
        this.#loadProfile(normalizedHostId),
        this.#loadWhatsApp(normalizedHostId),
      ]);
      const host = { ...profile, whatsapp };
      this.cache.set(normalizedHostId, { host, expiresAt: this.now() + this.cacheTtlMs });
      return structuredClone(host);
    } catch (error) {
      console.error(`[WebsitePublicHost] the host block could not be built for host ${normalizedHostId}.`, error);
      return buildEmptyPublicWebsiteHost();
    }
  }

  async #loadProfile(hostId) {
    const user = await this.cognitoRepository.getUserById(hostId);
    const attributes = new Map((user?.UserAttributes || []).map((attribute) => [attribute?.Name, attribute?.Value]));
    return {
      displayName: readAttribute(attributes, ["given_name", "name"]),
      profileImage: readAttribute(attributes, PROFILE_IMAGE_ATTRIBUTES),
    };
  }

  async #loadWhatsApp(hostId) {
    const empty = buildEmptyPublicWebsiteHost().whatsapp;
    const account = await this.whatsAppRepository.findConnectedAccountByUserId(hostId);
    if (!account) {
      return empty;
    }

    const phoneNumber = cleanText(await this.whatsAppRepository.readPhoneNumber(account));
    const phoneNumberDigits = toPhoneDigits(phoneNumber);
    if (!phoneNumberDigits) {
      return empty;
    }

    return { isAvailable: true, phoneNumber, phoneNumberDigits };
  }
}

export default WebsitePublicHostService;
