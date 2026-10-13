jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import {
  buildChannexRestrictionMapping,
  buildRestrictionRateItemsFromReadiness,
  summarizeChannexRequestBody,
} from "../../.shared/channelManagement/utils/channexAriPayloadUtils.js";

const restrictionItemFor = ({ overrides = {}, includeSnapshotBooleanRestrictions = true } = {}) =>
  buildRestrictionRateItemsFromReadiness({
    dates: ["2026-11-02"],
    overrideMap: new Map(Object.entries(overrides)),
    restrictionMapping: buildChannexRestrictionMapping([]),
    pricing: { roomRate: 150, weekendRate: 150 },
    readiness: {
      ratePlanMappings: [{ externalPropertyId: "property-1", externalRoomTypeId: "room-1", externalRatePlanId: "rate-1" }],
    },
    normalizedDomitsPropertyId: "domits-1",
    normalizedRestrictions: [],
    includeSnapshotBooleanRestrictions,
  }).restrictionRateItems[0];

const restrictionsFor = (options) => restrictionItemFor(options).channexRestrictions;

// Channex certification (12 Oct): a full sync must carry every declared restriction, and
// max_stay was missing on all 500 objects. A snapshot sends 0 for "no maximum", which is
// also how removing a maximum stay reaches Channex instead of the old value staying there.
describe("Channex restriction snapshot", () => {
  test("sends max_stay 0 when a date has no maximum stay", () => {
    expect(restrictionsFor()).toEqual(
      expect.objectContaining({ max_stay: 0, stop_sell: false, closed_to_arrival: false, closed_to_departure: false })
    );
  });

  test("keeps a maximum stay that the host set", () => {
    expect(restrictionsFor({ overrides: { "2026-11-02": { maxStay: 4 } } }).max_stay).toBe(4);
  });

  test("leaves max_stay out when the payload is not a snapshot", () => {
    expect(restrictionsFor({ includeSnapshotBooleanRestrictions: false })).not.toHaveProperty("max_stay");
  });

  test("records the snapshot max_stay as sent, not also as omitted", () => {
    const item = restrictionItemFor({ overrides: { "2026-11-02": { maxStay: 0 } } });

    expect(item.supportedRestrictions).toContainEqual(expect.objectContaining({ channexField: "max_stay", value: 0 }));
    expect(item.omittedRestrictions).not.toContainEqual(expect.objectContaining({ channexField: "max_stay" }));
  });
});

// The provider sends date ranges, and its result carries that request body, so the evidence
// summary has to read date_from and date_to as well as single dates.
describe("summarizeChannexRequestBody", () => {
  test("reports the first and last date of ranges and single dates", () => {
    const summary = summarizeChannexRequestBody({
      values: [
        { property_id: "property-1", date_from: "2026-12-01", date_to: "2027-05-01", rate: "432.00" },
        { property_id: "property-1", date: "2026-11-22", rate: "333.00" },
      ],
    });

    expect(summary).toEqual(expect.objectContaining({ valueCount: 2, firstDate: "2026-11-22", lastDate: "2027-05-01" }));
  });
});
