import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../../integrations/repositories/integrationPropertyRepository.js";
import IntegrationRatePlanRepository from "../../integrations/repositories/integrationRatePlanRepository.js";
import IntegrationRoomTypeRepository from "../../integrations/repositories/integrationRoomTypeRepository.js";
import ChannexCredentialStore from "../providers/channex/credentialStore.js";
import ChannexProviderClient from "../providers/channex/providerClient.js";
import ListingDistributionRepository from "../repositories/listingDistributionRepository.js";
import { listingDistributionReadiness } from "../utils/listingDistributionReadiness.js";
import { TIMEZONE_PROBLEM, resolveListingTimezone } from "../utils/listingTimezone.js";
import {
  buildChannexPropertyPayload,
  buildChannexRatePlanPayload,
  buildChannexRoomTypePayload,
} from "../utils/channexProvisioningPayloads.js";

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
const tryAgain = () =>
  bad(503, { error: "Channex did not answer in time. Try again in a moment.", errorCode: "DISTRIBUTION_TRY_AGAIN" });

const CHANNEL = "CHANNEX";
const ACTIVE = "ACTIVE";
const RATE_PLAN_TITLE = "Standard Rate";
// Three creates in a row stay below API Gateway's 29 s limit; the Lambda itself has 30 s.
const CREATE_TIMEOUT_MS = 7000;
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
    roomTypes = new IntegrationRoomTypeRepository(),
    ratePlans = new IntegrationRatePlanRepository(),
    channex = new ChannexProviderClient(),
    credentialStore = new ChannexCredentialStore(),
    credentialsRef = process.env.CHANNEX_PROVISIONING_CREDENTIALS_REF,
    now = () => Date.now(),
    newId = () => randomUUID(),
  } = {}) {
    Object.assign(this, { listings, accounts, props, roomTypes, ratePlans, channex, credentialStore, credentialsRef, now, newId });
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

  // Property, room type and rate plan, each found or created, and saved before the next call (D2).
  // Any step that cannot finish returns its answer; a later attempt continues from the saved ids.
  async createChannexObjects({ account, claim, listing, place }) {
    const secret = await this.credentialStore.readSecretOrNull(account.credentialsRef);
    if (!secret?.apiKey) {
      return bad(503, { error: "Distribution is not configured.", errorCode: "DISTRIBUTION_NOT_CONFIGURED" });
    }
    const credentials = { apiKey: secret.apiKey };
    const mapping = { integrationAccountId: account.id, domitsPropertyId: listing.propertyId };

    let externalPropertyId = claim.externalPropertyId;
    if (!externalPropertyId) {
      const property = await this.findOrCreate({
        list: () => this.channex.listProperties(credentials),
        rows: (result) => result.properties,
        idOf: (row) => row.externalPropertyId,
        isMatch: async (row) =>
          row.externalPropertyName === listing.title && !(await this.props.isExternalPropertyInUse(row.externalPropertyId)),
        create: () => this.channex.createProperty(credentials, buildChannexPropertyPayload(listing, place), { requestTimeoutMs: CREATE_TIMEOUT_MS }),
      });
      if (!property.ok) return property.answer;
      externalPropertyId = property.id;
      await this.props.setClaimExternalProperty(claim.id, externalPropertyId, listing.title);
    }

    const roomType = await this.findOrCreate({
      list: () => this.channex.listRoomTypes(credentials, externalPropertyId),
      rows: (result) => result.roomTypes,
      idOf: (row) => row.externalRoomTypeId,
      isMatch: async (row) => row.externalRoomTypeName === listing.title,
      create: () =>
        this.channex.createRoomType(credentials, buildChannexRoomTypePayload(listing, { channexPropertyId: externalPropertyId }), {
          requestTimeoutMs: CREATE_TIMEOUT_MS,
        }),
    });
    if (!roomType.ok) return roomType.answer;
    await this.roomTypes.upsert({
      ...mapping,
      externalPropertyId,
      externalRoomTypeId: roomType.id,
      externalRoomTypeName: listing.title,
      status: ACTIVE,
    });

    const ratePlan = await this.findOrCreate({
      list: () => this.channex.listRatePlans(credentials, roomType.id),
      rows: (result) => result.ratePlans,
      idOf: (row) => row.externalRatePlanId,
      isMatch: async (row) => row.externalRatePlanName === RATE_PLAN_TITLE,
      create: () =>
        this.channex.createRatePlan(
          credentials,
          buildChannexRatePlanPayload(listing, { channexPropertyId: externalPropertyId, channexRoomTypeId: roomType.id }),
          { requestTimeoutMs: CREATE_TIMEOUT_MS }
        ),
    });
    if (!ratePlan.ok) return ratePlan.answer;
    await this.ratePlans.upsert({
      ...mapping,
      externalPropertyId,
      externalRoomTypeId: roomType.id,
      externalRatePlanId: ratePlan.id,
      externalRatePlanName: RATE_PLAN_TITLE,
      status: ACTIVE,
    });

    return this.finishProvisioning({
      claim,
      listing,
      externalPropertyId,
      externalRoomTypeId: roomType.id,
      externalRatePlanId: ratePlan.id,
    });
  }

  // Look before create: list what exists, adopt exactly one match, create when there is none.
  // Without the list Domits cannot know whether the object exists, so a failed list never creates.
  async findOrCreate({ list, rows, idOf, isMatch, create }) {
    const listed = await list();
    if (!listed?.success) return { ok: false, answer: tryAgain() };

    const matches = [];
    for (const row of rows(listed) ?? []) {
      if (await isMatch(row)) matches.push(row);
    }
    if (matches.length > 1) {
      return {
        ok: false,
        answer: bad(409, {
          error: "Channex has more than one object that could belong to this listing.",
          errorCode: "DISTRIBUTION_NEEDS_ATTENTION",
        }),
      };
    }
    if (matches.length === 1) return { ok: true, id: idOf(matches[0]) };

    const result = await create();
    if (result.success) return { ok: true, id: result.externalId };
    // The create may still have happened in Channex; the next attempt looks first and adopts it.
    if (result.outcomeUnknown) return { ok: false, answer: tryAgain() };
    return {
      ok: false,
      answer: bad(502, {
        error: "Channex refused the listing.",
        errorCode: "DISTRIBUTION_CHANNEX_REFUSED",
        validationDetails: result.validationDetails ?? null,
      }),
    };
  }

  // Step 3d-4: mapping ACTIVE and the full sync, in one transaction.
  async finishProvisioning() {
    throw new Error("finishProvisioning is built in the next step of #506.");
  }
}
