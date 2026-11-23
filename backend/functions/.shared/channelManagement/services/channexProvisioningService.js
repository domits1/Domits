import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../../integrations/repositories/integrationPropertyRepository.js";
import ListingDistributionRepository from "../repositories/listingDistributionRepository.js";
import { listingDistributionReadiness } from "../utils/listingDistributionReadiness.js";
import { TIMEZONE_PROBLEM, resolveListingTimezone } from "../utils/listingTimezone.js";

// Turns a host's listing into a Channex property, room type and rate plan (design note D2, #506).
//
//   provisionListing
//     ├─ guards: listing exists ▶ host owns it ▶ ready (D3) ▶ timezone known (D4)
//     └─ claimListing: account row (D8) ▶ claim (PROVISIONING row) ▶ createChannexObjects
//                                                                      look-before-create ×3 ▶ mapping ACTIVE + full sync
//
// Each guard answers before anything is claimed or sent to Channex, and names what the host must fix.

const bad = (statusCode, response) => ({ statusCode, response });
const ok = (response) => ({ statusCode: 200, response });

const CHANNEL = "CHANNEX";
const CONNECTED = "CONNECTED";
const PROVISIONING = "PROVISIONING";

const TIMEZONE_ERROR_CODES = Object.freeze({
  [TIMEZONE_PROBLEM.UNKNOWN_COUNTRY]: "DISTRIBUTION_TIMEZONE_UNKNOWN_COUNTRY",
  [TIMEZONE_PROBLEM.CHOICE_NEEDED]: "DISTRIBUTION_TIMEZONE_CHOICE_NEEDED",
  [TIMEZONE_PROBLEM.INVALID_CHOICE]: "DISTRIBUTION_TIMEZONE_INVALID_CHOICE",
});

// On Aurora DSQL the loser of two simultaneous inserts fails on the unique key (23505) or, because DSQL
// checks conflicts only at commit, with a commit conflict (40001). Both mean another request won the row.
const LOST_CLAIM_CODES = new Set(["23505", "40001"]);
const isLostClaim = (error) => LOST_CLAIM_CODES.has(error?.code ?? error?.driverError?.code);

export default class ChannexProvisioningService {
  constructor({
    listings = new ListingDistributionRepository(),
    accounts = new IntegrationAccountRepository(),
    props = new IntegrationPropertyRepository(),
    credentialsRef = process.env.CHANNEX_PROVISIONING_CREDENTIALS_REF,
    now = () => Date.now(),
    newId = () => randomUUID(),
  } = {}) {
    Object.assign(this, { listings, accounts, props, credentialsRef, now, newId });
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

  async claimListing({ userId, listing, place }) {
    // Without Domits' key reference every host row would point nowhere, so nothing is written.
    if (!this.credentialsRef) {
      return bad(503, { error: "Distribution is not configured.", errorCode: "DISTRIBUTION_NOT_CONFIGURED" });
    }

    const account = await this.ensureHostAccount(userId);
    const inUse = await this.props.findInUseByAccountAndListing(account.id, listing.propertyId);

    if (inUse && inUse.status !== PROVISIONING) {
      return ok({ status: "ALREADY_CONNECTED", channexPropertyId: inUse.externalPropertyId });
    }

    // An earlier attempt that stopped halfway is continued from its own claim.
    const claim = inUse ?? (await this.insertClaim(account, listing));
    if (!claim) {
      return bad(409, {
        error: "This listing is already being connected.",
        errorCode: "DISTRIBUTION_ALREADY_IN_PROGRESS",
      });
    }

    return this.createChannexObjects({ account, claim, listing, place });
  }

  // One account row per host, pointing to Domits' single Channex key (D8).
  async ensureHostAccount(userId) {
    const now = this.now();
    const account = await this.accounts.findByUserIdAndChannel(userId, CHANNEL);
    if (!account) return this.createHostAccount(userId, now);
    if (account.status === CONNECTED && account.credentialsRef === this.credentialsRef) return account;
    return this.accounts.update(account.id, { status: CONNECTED, credentialsRef: this.credentialsRef, updatedAt: now });
  }

  // A new host's double click creates two rows at once; the unique key on ("userId", channel) for
  // CHANNEX lets one win, and the loser continues with the winner's row so both claims meet on one account.
  async createHostAccount(userId, now) {
    try {
      return await this.accounts.create({
        id: this.newId(),
        userId,
        channel: CHANNEL,
        displayName: "Domits",
        status: CONNECTED,
        credentialsRef: this.credentialsRef,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (!isLostClaim(error)) throw error;
      const winner = await this.accounts.findByUserIdAndChannel(userId, CHANNEL);
      if (!winner) throw error;
      return winner;
    }
  }

  // Returns the new claim, or null when another request won it. Not retried: a retry would only find
  // the winner's claim.
  async insertClaim(account, listing) {
    const claim = {
      id: this.newId(),
      integrationAccountId: account.id,
      domitsPropertyId: listing.propertyId,
      now: this.now(),
    };
    try {
      await this.props.insertClaim(claim);
    } catch (error) {
      if (isLostClaim(error)) return null;
      throw error;
    }
    return { ...claim, externalPropertyId: null, status: PROVISIONING };
  }

  // Step 3d-3: look before create for the property, room type and rate plan.
  async createChannexObjects() {
    throw new Error("createChannexObjects is built in the next step of #506.");
  }
}
