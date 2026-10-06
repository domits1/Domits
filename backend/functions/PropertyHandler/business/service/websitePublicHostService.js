import { CognitoRepository } from "../../data/repository/cognitoRepository.js";
import { WebsiteHostWhatsAppRepository } from "../../data/repository/websiteHostWhatsAppRepository.js";

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

const withoutHostIdentifier = (imageUrl, hostId, username) => {
  const normalizedUrl = imageUrl.toLowerCase();
  const identifiers = [hostId, username].map((value) => cleanText(value).toLowerCase()).filter(Boolean);
  return identifiers.some((identifier) => normalizedUrl.includes(identifier)) ? "" : imageUrl;
};

export class WebsitePublicHostService {
  constructor({
    cognitoRepository = new CognitoRepository(),
    whatsAppRepository = new WebsiteHostWhatsAppRepository(),
  } = {}) {
    this.cognitoRepository = cognitoRepository;
    this.whatsAppRepository = whatsAppRepository;
  }

  async loadPublicHost(hostId) {
    const normalizedHostId = cleanText(hostId);
    if (!normalizedHostId) {
      return buildEmptyPublicWebsiteHost();
    }

    try {
      const [profile, whatsapp] = await Promise.all([
        this.#loadProfile(normalizedHostId),
        this.#loadWhatsApp(normalizedHostId),
      ]);
      return { ...profile, whatsapp };
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
      profileImage: withoutHostIdentifier(readAttribute(attributes, PROFILE_IMAGE_ATTRIBUTES), hostId, user?.Username),
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
