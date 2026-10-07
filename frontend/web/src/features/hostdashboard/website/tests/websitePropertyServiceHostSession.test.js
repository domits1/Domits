import { enrichWebsitePropertyDetails } from "../services/websitePropertyService";
import { fetchWebsiteHostWhatsApp } from "../services/websiteHostMessagingService";
import { getAccessToken, getIdToken } from "../../../../services/getAccessToken";
import { dbListIcalSources } from "../../../../utils/icalRetrieveHost";

jest.mock("../../../../services/getAccessToken", () => ({ getAccessToken: jest.fn(), getIdToken: jest.fn() }));
jest.mock("../../../../utils/icalRetrieveHost", () => ({ dbListIcalSources: jest.fn(async () => null) }));
jest.mock("../services/websiteHostMessagingService", () => ({
  fetchWebsiteHostWhatsApp: jest.fn(async () => ({ connected: false, isAvailable: false })),
  getEmptyWebsiteHostWhatsApp: jest.fn(() => ({ connected: false, isAvailable: false })),
}));

const PROPERTY_DETAILS = {
  property: { id: "property-1", hostId: "host-1" },
  hostProfile: { id: "host-1", displayName: "Cliff House" },
};

describe("enrichWebsitePropertyDetails and the host's WhatsApp lookup", () => {
  beforeEach(() => {
    getAccessToken.mockReturnValue(null);
    getIdToken.mockResolvedValue("id-token-1");
    fetchWebsiteHostWhatsApp.mockResolvedValue({ connected: false, isAvailable: false });
    dbListIcalSources.mockResolvedValue(null);
    global.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("passes the host's id token to the lookup on the host's own pages", async () => {
    await enrichWebsitePropertyDetails(PROPERTY_DETAILS, null, { hostSession: true });

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(fetchWebsiteHostWhatsApp).toHaveBeenCalledWith("host-1", { idToken: "id-token-1" });
  });

  it("never asks for a token on the public site", async () => {
    getAccessToken.mockReturnValue("access-token-of-a-host-in-this-browser");

    await enrichWebsitePropertyDetails(PROPERTY_DETAILS);

    expect(getIdToken).not.toHaveBeenCalled();
    expect(fetchWebsiteHostWhatsApp).toHaveBeenCalledWith("host-1", { idToken: null });
  });

  it("gives up on the session after a few seconds and goes on without a token", async () => {
    jest.useFakeTimers();
    getIdToken.mockReturnValue(new Promise(() => {}));

    const pending = enrichWebsitePropertyDetails(PROPERTY_DETAILS, null, { hostSession: true });
    jest.advanceTimersByTime(5000);
    const details = await pending;

    expect(fetchWebsiteHostWhatsApp).toHaveBeenCalledWith("host-1", { idToken: null });
    expect(details.hostProfile.whatsapp).toEqual({ connected: false, isAvailable: false });
    jest.useRealTimers();
  });

  it("looks up without a token when nobody is signed in, instead of failing the page", async () => {
    getIdToken.mockRejectedValue(new Error("No current user"));

    const details = await enrichWebsitePropertyDetails(PROPERTY_DETAILS, null, { hostSession: true });

    expect(fetchWebsiteHostWhatsApp).toHaveBeenCalledWith("host-1", { idToken: null });
    expect(details.hostProfile.whatsapp).toEqual({ connected: false, isAvailable: false });
  });
});
