import { randomUUID } from "node:crypto";

import { withDsqlRetry } from "../../dsqlRetry.js";
import Database from "../../integrations/ORM/index.js";

import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../../integrations/repositories/integrationPropertyRepository.js";
import IntegrationRatePlanRepository from "../../integrations/repositories/integrationRatePlanRepository.js";
import IntegrationRoomTypeRepository from "../../integrations/repositories/integrationRoomTypeRepository.js";
import ChannexCredentialStore from "../providers/channex/credentialStore.js";
import ChannexProviderClient from "../providers/channex/providerClient.js";
import ChannexAriOutboxWriter from "./channexAriOutboxWriter.js";
import ListingDistributionRepository from "../repositories/listingDistributionRepository.js";
import { listingDistributionReadiness } from "../utils/listingDistributionReadiness.js";
import { TIMEZONE_PROBLEM, resolveListingTimezone } from "../utils/listingTimezone.js";
import {
  buildChannexPropertyPayload,
  buildChannexRatePlanPayload,
  buildChannexRoomTypePayload,
  listingIdOfChannexWebsite,
} from "../utils/channexProvisioningPayloads.js";

// Turns a host's listing into a Channex property, room type and rate plan (design note D2, #506).
//
//   provisionListing
//     ├─ guards: listing exists ▶ host owns it ▶ ready (D3) ▶ timezone known (D4)
//     └─ claimListing: account row (D8) ▶ claim (PROVISIONING row) ▶ createChannexObjects
//                                                                      look-before-create ×3 ▶ finishProvisioning:
//                                                                      mapping ACTIVE + full sync, one transaction
//
// Each guard answers before anything is claimed or sent to Channex, and names what the host must fix.

const bad = (statusCode, response) => ({ statusCode, response });
const ok = (response) => ({ statusCode: 200, response });
// The claim was no longer PROVISIONING when it was to be activated (archived or finished elsewhere).
const CLAIM_NOT_ACTIVATED = Symbol("claim not activated");
const needsAttention = () =>
  bad(409, {
    error: "This listing needs a check by support before it can be connected.",
    errorCode: "DISTRIBUTION_NEEDS_ATTENTION",
  });
const tryAgain = () =>
  bad(503, { error: "Channex did not answer in time. Try again in a moment.", errorCode: "DISTRIBUTION_TRY_AGAIN" });

const CHANNEL = "CHANNEX";
const ACTIVE = "ACTIVE";
const RATE_PLAN_TITLE = "Standard Rate";
// Three creates in a row stay below API Gateway's 29 s limit; the Lambda itself has 30 s.
const CREATE_TIMEOUT_MS = 7000;
const CONNECTED = "CONNECTED";
const CLAIM_LEASE_MS = 60_000;
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
    outbox = new ChannexAriOutboxWriter(),
    database = Database,
    credentialsRef = process.env.CHANNEX_PROVISIONING_CREDENTIALS_REF,
    now = () => Date.now(),
    newId = () => randomUUID(),
  } = {}) {
    Object.assign(this, {
      listings,
      accounts,
      props,
      roomTypes,
      ratePlans,
      channex,
      credentialStore,
      outbox,
      database,
      credentialsRef,
      now,
      newId,
    });
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
    if (!account) {
      return bad(409, {
        error: "This account is connected to its own Channex account. Contact support to use Domits' distribution.",
        errorCode: "DISTRIBUTION_OWN_CHANNEX_ACCOUNT",
      });
    }
    const inUse = await this.props.findInUseByAccountAndListing(account.id, listing.propertyId);

    if (inUse && inUse.status !== PROVISIONING) {
      return ok({ status: "ALREADY_CONNECTED", channexPropertyId: inUse.externalPropertyId });
    }

    const claim = inUse ? await this.takeOverStaleClaim(inUse) : await this.insertClaim(account, listing);
    if (!claim) {
      return bad(409, {
        error: "This listing is already being connected.",
        errorCode: "DISTRIBUTION_ALREADY_IN_PROGRESS",
      });
    }

    let answer;
    try {
      answer = await this.createChannexObjects({ account, claim, listing, place });
      return answer;
    } finally {
      if (answer?.statusCode !== 200) await this.releaseClaimQuietly(claim.id);
    }
  }

  // A failed release only means the next click waits out the lease; the attempt's own answer matters more.
  async releaseClaimQuietly(claimId) {
    try {
      await this.props.releaseClaim(claimId);
    } catch (error) {
      console.error(JSON.stringify({ event: "CHANNEX_PROVISIONING_RELEASE_FAILED", claimId, error: error?.message }));
    }
  }

  // A running attempt updates its claim with every saved id and ends within the 29 s route limit, so a
  // claim untouched for CLAIM_LEASE_MS belongs to an attempt that died. Only that one is continued, and
  // only by the request whose conditional update wins (#4031 review). Returns null otherwise.
  async takeOverStaleClaim(claim) {
    const now = this.now();
    if (now - Number(claim.updatedAt) < CLAIM_LEASE_MS) return null;
    try {
      const won = await this.props.takeOverClaim({ claimId: claim.id, expectedUpdatedAt: claim.updatedAt, now });
      return won ? { ...claim, updatedAt: now } : null;
    } catch (error) {
      if (isLostClaim(error)) return null;
      throw error;
    }
  }

  async ensureHostAccount(userId) {
    const now = this.now();
    const account = await this.accounts.findByUserIdAndChannel(userId, CHANNEL);
    if (!account) return this.createHostAccount(userId, now);
    // A row with another Channex key belongs to a host who connected their own Channex account; pointing it
    // at Domits' key would push their mappings to the wrong account (#4031 review). Returns null for it.
    if (account.credentialsRef && account.credentialsRef !== this.credentialsRef) return null;
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

  // Not retried: a retry would only find the winner's claim.
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

  // Each id is saved before the next call, so a later attempt continues from the first missing object.
  async createChannexObjects({ account, claim, listing, place }) {
    const secret = await this.credentialStore.readSecretOrNull(account.credentialsRef);
    if (!secret?.apiKey) {
      return bad(503, { error: "Distribution is not configured.", errorCode: "DISTRIBUTION_NOT_CONFIGURED" });
    }
    const credentials = { apiKey: secret.apiKey };
    const mapping = { integrationAccountId: account.id, domitsPropertyId: listing.propertyId };

    let externalPropertyId = claim.externalPropertyId;
    if (!externalPropertyId) {
      // Matched by the listing's link, not its title: titles repeat across hosts on Domits' shared key (D8).
      const property = await this.findOrCreate({
        list: () => this.channex.listProperties(credentials),
        rows: (result) => result.properties,
        idOf: (row) => row.externalPropertyId,
        isMatch: async (row) =>
          listingIdOfChannexWebsite(row.website) === listing.propertyId &&
          !(await this.props.isExternalPropertyInUse(row.externalPropertyId)),
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

  // Without the list Domits cannot know whether the object exists, so a failed list never creates.
  async findOrCreate({ list, rows, idOf, isMatch, create }) {
    const listed = await list();
    if (!listed?.success) return { ok: false, answer: tryAgain() };

    const matches = [];
    for (const row of rows(listed) ?? []) {
      if (await isMatch(row)) matches.push(row);
    }
    if (matches.length > 1) {
      return { ok: false, answer: needsAttention() };
    }
    if (matches.length === 1) return { ok: true, id: idOf(matches[0]) };

    const result = await create();
    if (result.success) return { ok: true, id: result.externalId };
    // The create may still have happened in Channex; the next attempt looks first and adopts it.
    if (result.outcomeUnknown || result.retryable) return { ok: false, answer: tryAgain() };
    return {
      ok: false,
      answer: bad(502, {
        error: "Channex refused the listing.",
        errorCode: "DISTRIBUTION_CHANNEX_REFUSED",
        validationDetails: result.validationDetails ?? null,
      }),
    };
  }

  // The claim becomes the live mapping and the full sync is queued in one transaction, so a listing is
  // never live without its calendar and prices on the way. Activate first: the outbox writer only queues
  // for an ACTIVE mapping. On failure nothing is half-saved; the next attempt adopts the Channex objects
  // (look before create) and finishes.
  async finishProvisioning({ claim, listing, externalPropertyId }) {
    try {
      const client = await this.database.getInstance();
      const fullSyncQueued = await withDsqlRetry(() =>
        client.transaction(async (manager) => {
          if (!(await this.props.activateClaim(manager, claim.id))) return CLAIM_NOT_ACTIVATED;
          return this.outbox.enqueueChannexFullSync(manager, { domitsPropertyId: listing.propertyId });
        })
      );
      if (fullSyncQueued === CLAIM_NOT_ACTIVATED) return needsAttention();
      return ok({ status: "PROVISIONED", channexPropertyId: externalPropertyId, fullSyncQueued });
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "CHANNEX_PROVISIONING_FINISH_FAILED",
          domitsPropertyId: listing.propertyId,
          claimId: claim.id,
          error: error?.message ?? String(error),
        })
      );
      return tryAgain();
    }
  }
}
