import {
  LISTING_VIEW,
  PLATFORMS,
  describeListingView,
  describePlatformCard,
  describeMissingItems,
} from "./distributionStates";

const channel = (otaCode, label) => ({ otaCode, label });
const listing = (overrides = {}) => ({
  propertyId: "p1",
  distribution: { status: "READY", missing: [] },
  channels: [],
  ...overrides,
});

describe("describeListingView", () => {
  test.each([
    ["a ready, provisioned listing", listing(), LISTING_VIEW.CARDS],
    [
      "a listing that is not ready",
      listing({ distribution: { status: "NOT_ENABLED", missing: ["MISSING_PRICE"] } }),
      LISTING_VIEW.NOT_READY,
    ],
    ["a listing that is being set up", listing({ distribution: { status: "PROVISIONING" } }), LISTING_VIEW.SETTING_UP],
    [
      "a listing with missing items that is also being set up",
      listing({ distribution: { status: "PROVISIONING", missing: ["MISSING_PRICE"] } }),
      LISTING_VIEW.NOT_READY,
    ],
    ["a listing not turned on yet", listing({ distribution: { status: "NOT_ENABLED" } }), LISTING_VIEW.CARDS],
  ])("%s", (_name, input, expected) => {
    expect(describeListingView(input)).toBe(expected);
  });
});

describe("describePlatformCard", () => {
  const booking = (input) => describePlatformCard(input, "BookingCom");

  test.each([
    ["not turned on", listing({ distribution: { status: "NOT_ENABLED" } }), "Not connected", "neutral", false, false],
    ["turned on, no channel for this OTA", listing(), "Not connected", "neutral", false, false],
    ["channel syncing", listing({ channels: [channel("BookingCom", "SYNCING")] }), "Syncing…", "pending", true, false],
    ["channel live", listing({ channels: [channel("BookingCom", "LIVE")] }), "Live", "success", true, false],
    [
      "channel disconnecting",
      listing({ channels: [channel("BookingCom", "DISCONNECTING")] }),
      "Disconnecting…",
      "pending",
      false,
      true,
    ],
    [
      "channel disconnected",
      listing({ channels: [channel("BookingCom", "DISCONNECTED")] }),
      "Disconnected",
      "neutral",
      false,
      false,
    ],
    [
      "channel needing attention",
      listing({ channels: [channel("BookingCom", "NEEDS_ATTENTION")] }),
      "Needs attention",
      "error",
      true,
      false,
    ],
  ])("%s", (_name, input, label, tone, switchOn, switchDisabled) => {
    expect(booking(input)).toMatchObject({ label, tone, switchOn, switchDisabled });
  });

  test("reads only the channel of the requested OTA", () => {
    const input = listing({ channels: [channel("Airbnb", "LIVE"), channel("BookingCom", "SYNCING")] });

    expect(describePlatformCard(input, "Airbnb").label).toBe("Live");
    expect(describePlatformCard(input, "BookingCom").label).toBe("Syncing…");
    expect(describePlatformCard(input, "Vrbo").label).toBe("Not connected");
  });

  test("UNKNOWN reads as a neutral status that is on but locked, never as Live", () => {
    const state = booking(listing({ channels: [channel("BookingCom", "UNKNOWN")] }));

    expect(state).toMatchObject({ label: "Status unknown", tone: "neutral", switchOn: true, switchDisabled: true });
    expect(state.note).toBe("We couldn't check this connection. Click Refresh to try again.");
  });

  test.each(["SOMETHING_NEW", "", "constructor", "toString"])(
    "the label %p is outside the list, so it reads like UNKNOWN and never as Live",
    (label) => {
      const state = booking(listing({ channels: [channel("BookingCom", label)] }));

      expect(state).toEqual(booking(listing({ channels: [channel("BookingCom", "UNKNOWN")] })));
      expect(state.label).not.toBe("Live");
    }
  );

  test("names the platform in the sentence for a channel that needs attention", () => {
    const state = describePlatformCard(listing({ channels: [channel("Vrbo", "NEEDS_ATTENTION")] }), "Vrbo");

    expect(state.note).toBe("Something needs your attention on Vrbo.");
  });

  test("has no note in the states that need none", () => {
    expect(booking(listing({ channels: [channel("BookingCom", "LIVE")] })).note).toBeNull();
  });

  test("tells the host a disconnect takes about a minute and where to see the result", () => {
    const state = booking(listing({ channels: [channel("BookingCom", "DISCONNECTING")] }));

    expect(state.note).toBe("This takes about a minute. Click Refresh to see the result.");
    expect(state.tone).toBe("pending");
  });

  describe("while the turn-off request runs", () => {
    test.each([
      ["a live channel", listing({ channels: [channel("BookingCom", "LIVE")] })],
      ["a channel needing attention", listing({ channels: [channel("BookingCom", "NEEDS_ATTENTION")] })],
      ["a channel that is not there", listing()],
    ])("%s reads Turning off…, off and locked, with no note", (_name, input) => {
      expect(describePlatformCard(input, "BookingCom", { turningOff: true })).toEqual({
        label: "Turning off…",
        tone: "pending",
        switchOn: false,
        switchDisabled: true,
        note: null,
      });
    });

    test("only for the OTA being turned off: the others read as they do", () => {
      const input = listing({ channels: [channel("BookingCom", "LIVE"), channel("Airbnb", "LIVE")] });

      expect(describePlatformCard(input, "Airbnb").label).toBe("Live");
      expect(describePlatformCard(input, "Airbnb", { turningOff: false }).label).toBe("Live");
    });
  });
});

describe("describeMissingItems", () => {
  test("turns missing-item codes into one sentence each, in the order the backend gave", () => {
    expect(
      describeMissingItems(["NOT_PUBLISHED", "MISSING_ADDRESS", "MISSING_GUESTS", "MISSING_PRICE"])
    ).toEqual(["Publish your listing first", "Add the address", "Add the maximum number of guests", "Add a price"]);
  });

  test("falls back to one generic sentence when no code is known", () => {
    expect(describeMissingItems([])).toEqual(["Complete your listing first"]);
    expect(describeMissingItems(["SOMETHING_NEW"])).toEqual(["Complete your listing first"]);
  });

  test("drops unknown codes next to known ones", () => {
    expect(describeMissingItems(["MISSING_PRICE", "SOMETHING_NEW"])).toEqual(["Add a price"]);
  });
});

describe("PLATFORMS", () => {
  test("lists the three first-version OTAs in a fixed order", () => {
    expect(PLATFORMS.map((platform) => platform.otaCode)).toEqual(["BookingCom", "Airbnb", "Vrbo"]);
    expect(PLATFORMS.map((platform) => platform.name)).toEqual(["Booking.com", "Airbnb", "Vrbo"]);
  });
});
