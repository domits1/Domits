import ChannexProvisioningService from "../../.shared/channelManagement/services/channexProvisioningService.js";

// Design note D2/D3/D4 (#506): before anything is claimed or sent to Channex, the listing must exist,
// belong to the host, be ready for distribution and have a timezone. Each refusal names what to fix.
const readyListing = (overrides = {}) => ({
  propertyId: "listing-1",
  hostId: "host-1",
  status: "ACTIVE",
  location: { country: "Netherlands" },
  guests: 4,
  roomRate: 150,
  ...overrides,
});

const buildService = (listing) => {
  const claim = jest.fn();
  const service = new ChannexProvisioningService({
    listings: { findListing: jest.fn().mockResolvedValue(listing) },
    claimListing: claim,
  });
  return { service, claim };
};

describe("ChannexProvisioningService.provisionListing guards", () => {
  test("a listing that does not exist answers 404", async () => {
    const { service, claim } = buildService(null);

    const result = await service.provisionListing({ userId: "host-1", domitsPropertyId: "missing" });

    expect(result).toEqual({
      statusCode: 404,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_LISTING_NOT_FOUND" }),
    });
    expect(claim).not.toHaveBeenCalled();
  });

  test("someone else's listing answers 403", async () => {
    const { service, claim } = buildService(readyListing({ hostId: "host-2" }));

    const result = await service.provisionListing({ userId: "host-1", domitsPropertyId: "listing-1" });

    expect(result).toEqual({
      statusCode: 403,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_LISTING_NOT_OWNED" }),
    });
    expect(claim).not.toHaveBeenCalled();
  });

  test("a listing that is not ready answers 422 with everything that is missing", async () => {
    const { service, claim } = buildService(readyListing({ status: "INACTIVE", guests: null }));

    const result = await service.provisionListing({ userId: "host-1", domitsPropertyId: "listing-1" });

    expect(result).toEqual({
      statusCode: 422,
      response: expect.objectContaining({
        errorCode: "DISTRIBUTION_LISTING_NOT_READY",
        missing: ["NOT_PUBLISHED", "MISSING_GUESTS"],
      }),
    });
    expect(claim).not.toHaveBeenCalled();
  });

  test("a country with several timezones answers 422 with the options for the host to pick", async () => {
    const { service, claim } = buildService(readyListing({ location: { country: "Spain" } }));

    const result = await service.provisionListing({ userId: "host-1", domitsPropertyId: "listing-1" });

    expect(result).toEqual({
      statusCode: 422,
      response: expect.objectContaining({
        errorCode: "DISTRIBUTION_TIMEZONE_CHOICE_NEEDED",
        options: expect.arrayContaining(["Europe/Madrid", "Atlantic/Canary"]),
      }),
    });
    expect(claim).not.toHaveBeenCalled();
  });

  test("a picked timezone outside the country answers 422", async () => {
    const { service } = buildService(readyListing({ location: { country: "Spain" } }));

    const result = await service.provisionListing({
      userId: "host-1",
      domitsPropertyId: "listing-1",
      chosenTimezone: "Asia/Tokyo",
    });

    expect(result.response.errorCode).toBe("DISTRIBUTION_TIMEZONE_INVALID_CHOICE");
  });

  test("a ready listing with a known timezone goes on to the claim", async () => {
    const { service, claim } = buildService(readyListing());
    claim.mockResolvedValue({ statusCode: 200, response: {} });

    await service.provisionListing({ userId: "host-1", domitsPropertyId: "listing-1" });

    expect(claim).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "host-1",
        listing: expect.objectContaining({ propertyId: "listing-1" }),
        place: { countryCode: "NL", timezone: "Europe/Amsterdam" },
      })
    );
  });
});
