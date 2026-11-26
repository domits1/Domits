const { ChannexProviderClient, CREDENTIALS, jsonResponse, useMockedFetch } = require("./channexProviderClientTestUtils.js");

// Design note D7 (#506): Channex is the source of truth for which OTAs a property is connected to and
// whether they are active (Channex docs: GET /channels, filter[property_id], attribute `channel` is the
// adapter code, `is_active` the state). Only the OTAs Domits supports are returned, with Domits' codes.
const channel = (id, code, isActive) => ({ id, type: "channel", attributes: { channel: code, is_active: isActive } });

describe("ChannexProviderClient.listChannels", () => {
  useMockedFetch();
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
  });

  test("asks Channex for the channels of one property", async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: [] }));

    await client.listChannels(CREDENTIALS, "property-1");

    const [url, request] = global.fetch.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe("/api/v1/channels");
    expect(parsed.searchParams.get("filter[property_id]")).toBe("property-1");
    expect(request).toMatchObject({ method: "GET", headers: { "user-api-key": "test-api-key" } });
  });

  test("returns Booking.com, Airbnb and Vrbo with Domits' codes and whether they are active", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(200, {
        data: [channel("c1", "BDC", true), channel("c2", "ABB", false), channel("c3", "VRB", true)],
      })
    );

    expect(await client.listChannels(CREDENTIALS, "property-1")).toEqual({
      success: true,
      channels: [
        { channexChannelId: "c1", otaCode: "BookingCom", isActive: true },
        { channexChannelId: "c2", otaCode: "Airbnb", isActive: false },
        { channexChannelId: "c3", otaCode: "Vrbo", isActive: true },
      ],
    });
  });

  // The iframe only offers these three, but a channel set up another way must not break the tab.
  test("leaves out channels Domits does not support", async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: [channel("c1", "BDC", true), channel("c9", "Expedia", true)] }));

    const { channels } = await client.listChannels(CREDENTIALS, "property-1");

    expect(channels.map((row) => row.otaCode)).toEqual(["BookingCom"]);
  });

  test("an is_active that is not a boolean is passed on as unknown", async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: [channel("c1", "BDC", "yes")] }));

    const { channels } = await client.listChannels(CREDENTIALS, "property-1");

    expect(channels[0].isActive).toBeNull();
  });

  test("refuses without an API key or a property, calling nothing", async () => {
    expect(await client.listChannels({}, "property-1")).toMatchObject({ success: false, errorCode: "MISSING_API_KEY" });
    expect(await client.listChannels(CREDENTIALS, "")).toMatchObject({ success: false, errorCode: "MISSING_PROPERTY_ID" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test.each([
    ["an error status", () => global.fetch.mockResolvedValue(jsonResponse(500, {}))],
    ["an answer without a data list", () => global.fetch.mockResolvedValue(jsonResponse(200, { data: null }))],
  ])("%s is a failure, so the tab can show the channels as unknown", async (_label, answer) => {
    answer();

    expect(await client.listChannels(CREDENTIALS, "property-1")).toMatchObject({ success: false, channels: [] });
  });

  test("a hanging call times out instead of holding the tab", async () => {
    global.fetch = jest.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
    );

    expect(await client.listChannels(CREDENTIALS, "property-1", { requestTimeoutMs: 5 })).toMatchObject({
      success: false,
      errorCode: "CHANNEX_CHANNELS_TIMEOUT",
    });
  });
});
