import ListingDistributionRepository from "../repositories/listingDistributionRepository.js";
import { listingDistributionReadiness } from "../utils/listingDistributionReadiness.js";
import { TIMEZONE_PROBLEM, resolveListingTimezone } from "../utils/listingTimezone.js";

// Turns a host's listing into a Channex property, room type and rate plan (design note D2, #506).
//
//   provisionListing
//     ├─ guards: listing exists ▶ host owns it ▶ ready (D3) ▶ timezone known (D4)
//     └─ claimListing: claim (PROVISIONING row) ▶ look-before-create ×3 ▶ mapping ACTIVE + full sync
//
// Each guard answers before anything is claimed or sent to Channex, and names what the host must fix.

const bad = (statusCode, response) => ({ statusCode, response });

const TIMEZONE_ERROR_CODES = Object.freeze({
  [TIMEZONE_PROBLEM.UNKNOWN_COUNTRY]: "DISTRIBUTION_TIMEZONE_UNKNOWN_COUNTRY",
  [TIMEZONE_PROBLEM.CHOICE_NEEDED]: "DISTRIBUTION_TIMEZONE_CHOICE_NEEDED",
  [TIMEZONE_PROBLEM.INVALID_CHOICE]: "DISTRIBUTION_TIMEZONE_INVALID_CHOICE",
});

export default class ChannexProvisioningService {
  constructor({ listings = new ListingDistributionRepository(), claimListing } = {}) {
    this.listings = listings;
    this.claimListing = claimListing;
  }

  async provisionListing({ userId, domitsPropertyId, chosenTimezone }) {
    const listing = await this.listings.findListing(domitsPropertyId);
    if (!listing) {
      return bad(404, { error: "Listing not found.", errorCode: "DISTRIBUTION_LISTING_NOT_FOUND" });
    }
    if (listing.hostId !== userId) {
      return bad(403, { error: "This listing belongs to another host.", errorCode: "DISTRIBUTION_LISTING_NOT_OWNED" });
    }

    const readiness = listingDistributionReadiness(listing);
    if (!readiness.ready) {
      return bad(422, {
        error: "The listing is not ready for distribution.",
        errorCode: "DISTRIBUTION_LISTING_NOT_READY",
        missing: readiness.missing,
      });
    }

    const timezone = resolveListingTimezone({ country: listing.location?.country, chosenTimezone });
    if (!timezone.ok) {
      return bad(422, {
        error: "The listing's timezone is not known.",
        errorCode: TIMEZONE_ERROR_CODES[timezone.problem],
        options: timezone.options ?? [],
      });
    }

    return this.claimListing({
      userId,
      listing,
      place: { countryCode: timezone.countryCode, timezone: timezone.timezone },
    });
  }
}
