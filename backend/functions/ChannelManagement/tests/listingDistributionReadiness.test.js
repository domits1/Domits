import {
  READINESS_GAP,
  listingDistributionReadiness,
} from "../../.shared/channelManagement/utils/listingDistributionReadiness.js";

// A live listing with everything Channex needs (design note D3).
const readyListing = () => ({
  status: "ACTIVE",
  location: { country: "Netherlands", city: "Haarlem", street: "Grote Markt" },
  guests: 4,
  roomRate: 150,
});

describe("listingDistributionReadiness", () => {
  test("a live listing with address, guests and price is ready", () => {
    expect(listingDistributionReadiness(readyListing())).toEqual({ ready: true });
  });

  test.each(["INACTIVE", "PENDING_REVIEW", "REJECTED", "ARCHIVED", undefined])(
    "status %s is not published",
    (status) => {
      expect(listingDistributionReadiness({ ...readyListing(), status })).toEqual({
        ready: false,
        missing: [READINESS_GAP.NOT_PUBLISHED],
      });
    }
  );

  // Listings without a location row exist (#3921); a blank country also blocks the timezone step (D4).
  test.each([
    ["no location row", null],
    ["a blank country", { country: "  ", city: "Haarlem", street: "Grote Markt" }],
  ])("%s is a missing address", (_label, location) => {
    expect(listingDistributionReadiness({ ...readyListing(), location })).toEqual({
      ready: false,
      missing: [READINESS_GAP.MISSING_ADDRESS],
    });
  });

  test.each([null, 0, -1, 2.5])("guests %p is missing guests", (guests) => {
    expect(listingDistributionReadiness({ ...readyListing(), guests })).toEqual({
      ready: false,
      missing: [READINESS_GAP.MISSING_GUESTS],
    });
  });

  test.each([null, 0, -10])("room rate %p is a missing price", (roomRate) => {
    expect(listingDistributionReadiness({ ...readyListing(), roomRate })).toEqual({
      ready: false,
      missing: [READINESS_GAP.MISSING_PRICE],
    });
  });

  // The tab shows every gap at once, so the host fixes them in one go instead of one per attempt.
  test("lists every gap, in a fixed order", () => {
    expect(listingDistributionReadiness({ status: "INACTIVE", location: null, guests: null, roomRate: null })).toEqual({
      ready: false,
      missing: [
        READINESS_GAP.NOT_PUBLISHED,
        READINESS_GAP.MISSING_ADDRESS,
        READINESS_GAP.MISSING_GUESTS,
        READINESS_GAP.MISSING_PRICE,
      ],
    });
  });
});
