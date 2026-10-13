jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import {
  buildChannexRestrictionMapping,
  buildRestrictionRateItemsFromReadiness,
} from "../../.shared/channelManagement/utils/channexAriPayloadUtils.js";

const restrictionsFor = ({ overrides = {}, includeSnapshotBooleanRestrictions = true } = {}) =>
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
  }).restrictionRateItems[0].channexRestrictions;

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
});
