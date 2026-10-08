import { attachWebsiteHostProfile, enrichWebsitePropertyDetails } from "../services/websitePropertyService";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(() => ""),
}));

jest.mock("../../../../utils/icalRetrieveHost", () => ({
  dbListIcalSources: jest.fn(async () => null),
}));

jest.mock("../../services/fetchUserProfileById", () => ({
  fetchUserProfileById: jest.fn(async (userId) => ({
    givenName: "Fetched",
    userId,
    profileImage: null,
    email: null,
    phoneNumber: null,
  })),
  getEmptyUserProfile: (userId = null) => ({
    givenName: null,
    userId,
    profileImage: null,
    email: null,
    phoneNumber: null,
  }),
}));

jest.mock("../services/websiteHostMessagingService", () => {
  const empty = { connected: false, displayName: "", phoneNumber: "", phoneNumberDigits: "", isAvailable: false };
  return {
    fetchWebsiteHostWhatsApp: jest.fn(async () => ({ ...empty })),
    getEmptyWebsiteHostWhatsApp: () => ({ ...empty }),
  };
});

const { fetchUserProfileById } = jest.requireMock("../../services/fetchUserProfileById");
const { fetchWebsiteHostWhatsApp } = jest.requireMock("../services/websiteHostMessagingService");

const PUBLIC_SNAPSHOT = {
  property: { id: "property-1", title: "Villa" },
  images: [],
};

const HOST = {
  displayName: " Karim ",
  profileImage: "https://cdn.example/karim.jpg",
  whatsapp: { isAvailable: true, phoneNumber: "+31 6 1234 5678", phoneNumberDigits: "31612345678" },
};

describe("the public site host profile comes from the render response", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchUserProfileById.mockImplementation(async (userId) => ({
      givenName: "Fetched",
      userId,
      profileImage: null,
      email: null,
      phoneNumber: null,
    }));
    fetchWebsiteHostWhatsApp.mockImplementation(async () => ({
      connected: false,
      displayName: "",
      phoneNumber: "",
      phoneNumberDigits: "",
      isAvailable: false,
    }));
    globalThis.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) }));
  });

  it("builds the host profile from the host block without any lookup by host id", async () => {
    const details = await attachWebsiteHostProfile(PUBLIC_SNAPSHOT, null, { host: HOST });

    expect(details.hostProfile).toEqual({
      givenName: "Karim",
      userId: null,
      profileImage: "https://cdn.example/karim.jpg",
      email: null,
      phoneNumber: null,
      whatsapp: {
        connected: true,
        displayName: "",
        phoneNumber: "+31 6 1234 5678",
        phoneNumberDigits: "31612345678",
        isAvailable: true,
      },
    });
    expect(fetchUserProfileById).not.toHaveBeenCalled();
    expect(fetchWebsiteHostWhatsApp).not.toHaveBeenCalled();
    expect(details.property).toBe(PUBLIC_SNAPSHOT.property);
  });

  it("shows no WhatsApp button when the host block says it is unavailable, whatever number it carries", async () => {
    const details = await attachWebsiteHostProfile(PUBLIC_SNAPSHOT, null, {
      host: {
        ...HOST,
        whatsapp: { isAvailable: false, phoneNumber: "+31 6 1234 5678", phoneNumberDigits: "31612345678" },
      },
    });

    expect(details.hostProfile.whatsapp).toEqual({
      connected: false,
      displayName: "",
      phoneNumber: "",
      phoneNumberDigits: "",
      isAvailable: false,
    });
  });

  it("renders an empty host for an empty host block and never falls back to a lookup", async () => {
    const details = await enrichWebsitePropertyDetails(PUBLIC_SNAPSHOT, null, {
      host: {
        displayName: "",
        profileImage: "",
        whatsapp: { isAvailable: false, phoneNumber: "", phoneNumberDigits: "" },
      },
    });

    expect(details.hostProfile.givenName).toBeNull();
    expect(details.hostProfile.whatsapp.isAvailable).toBe(false);
    expect(fetchUserProfileById).not.toHaveBeenCalled();
    expect(fetchWebsiteHostWhatsApp).not.toHaveBeenCalled();
  });

  it("keeps the lookup by host id for the host's own preview, where no host block exists", async () => {
    const details = await attachWebsiteHostProfile({ property: { id: "property-1", hostId: "host-1" } });

    expect(fetchUserProfileById).toHaveBeenCalledWith("host-1");
    expect(fetchWebsiteHostWhatsApp).toHaveBeenCalledWith("host-1");
    expect(details.hostProfile.givenName).toBe("Fetched");
  });
});
