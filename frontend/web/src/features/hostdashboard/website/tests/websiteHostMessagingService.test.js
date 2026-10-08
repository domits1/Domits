import {
  clearWebsiteHostWhatsAppCache,
  fetchWebsiteHostWhatsApp,
  getEmptyWebsiteHostWhatsApp,
} from "../services/websiteHostMessagingService";

const WHATSAPP_INTEGRATION = {
  channel: "WHATSAPP",
  status: "CONNECTED",
  externalAccountId: "waba-1",
  displayName: "Cliff House",
  phoneNumber: "+31 6 1234 5678",
};

const respondWith = (status, body) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("fetchWebsiteHostWhatsApp", () => {
  beforeEach(() => {
    clearWebsiteHostWhatsAppCache();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("sends the host's id token as a bearer token and reads the WhatsApp integration", async () => {
    global.fetch.mockReturnValue(respondWith(200, [WHATSAPP_INTEGRATION]));

    const whatsapp = await fetchWebsiteHostWhatsApp("host-1", { idToken: "id-token-1" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/integrations?userId=host-1");
    expect(options.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer id-token-1" });
    expect(whatsapp).toEqual({
      connected: true,
      displayName: "Cliff House",
      phoneNumber: "+31 6 1234 5678",
      phoneNumberDigits: "31612345678",
      isAvailable: true,
    });
  });

  it("sends no authorization header when there is no session, and still answers the empty block on a refusal", async () => {
    global.fetch.mockReturnValue(respondWith(401, { message: "Unauthorized" }));

    const whatsapp = await fetchWebsiteHostWhatsApp("host-1");

    expect(global.fetch.mock.calls[0][1].headers).toEqual({ "Content-Type": "application/json" });
    expect(whatsapp).toEqual(getEmptyWebsiteHostWhatsApp());
  });

  it("keeps the answer with a token apart from the answer without one for the same host", async () => {
    global.fetch
      .mockReturnValueOnce(respondWith(200, []))
      .mockReturnValueOnce(respondWith(200, [WHATSAPP_INTEGRATION]));

    const anonymous = await fetchWebsiteHostWhatsApp("host-1");
    const host = await fetchWebsiteHostWhatsApp("host-1", { idToken: "id-token-1" });
    const hostAgain = await fetchWebsiteHostWhatsApp("host-1", { idToken: "id-token-1" });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(anonymous.isAvailable).toBe(false);
    expect(host.isAvailable).toBe(true);
    expect(hostAgain).toBe(host);
  });

  it("forgets a refused or failed lookup, so a fresh session can try again without a reload", async () => {
    global.fetch
      .mockReturnValueOnce(respondWith(401, {}))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockReturnValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new TypeError("body lost")) })
      )
      .mockReturnValueOnce(respondWith(200, [WHATSAPP_INTEGRATION]));

    expect((await fetchWebsiteHostWhatsApp("host-1", { idToken: "expired" })).isAvailable).toBe(false);
    expect((await fetchWebsiteHostWhatsApp("host-1", { idToken: "fresh" })).isAvailable).toBe(false);
    expect((await fetchWebsiteHostWhatsApp("host-1", { idToken: "fresh" })).isAvailable).toBe(false);
    expect((await fetchWebsiteHostWhatsApp("host-1", { idToken: "fresh" })).isAvailable).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it("answers the empty block without a request when the host id is missing, and on a network failure", async () => {
    expect(await fetchWebsiteHostWhatsApp("", { idToken: "id-token-1" })).toEqual(getEmptyWebsiteHostWhatsApp());
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await fetchWebsiteHostWhatsApp("host-2", { idToken: "id-token-1" })).toEqual(getEmptyWebsiteHostWhatsApp());
  });
});
