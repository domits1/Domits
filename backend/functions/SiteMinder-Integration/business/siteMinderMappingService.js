import { groupByRoomType, mapRoomRates } from "../util/roomRates.js";
import { SITEMINDER_CHANNEL } from "../util/siteMinderConfig.js";

const ACTIVE = "ACTIVE";
const INACTIVE = "INACTIVE";

export class SiteMinderMappingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SiteMinderMappingError";
    this.code = code;
  }
}

const isActive = (row) => String(row?.status ?? "").toUpperCase() === ACTIVE;
const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new SiteMinderMappingError("SITEMINDER_MAPPING_INVALID", `${label} is required`);
  }
  return value.trim();
};

// Links a Domits property to a SiteMinder hotel and stores its room types and rate plans, as SiteMinder returns
// them from Rooms and Rates. Uses the shared channel_integration_* tables, the same ones Channex uses.
export class SiteMinderMappingService {
  constructor({ restClient, accounts, props, roomTypes, ratePlans, propertyLookup, pmsCode, credentialsRef, now = () => Date.now(), newId }) {
    Object.assign(this, { restClient, accounts, props, roomTypes, ratePlans, propertyLookup, pmsCode, credentialsRef, now, newId });
  }

  async syncHotel({ userId, domitsPropertyId, hotelCode }) {
    const owner = requireText(userId, "userId");
    const propertyId = requireText(domitsPropertyId, "domitsPropertyId");
    const hotel = requireText(hotelCode, "hotelCode");

    await this.#checkOwner(owner, propertyId);
    const account = await this.#account(owner);
    await this.#checkHotelIsFree(hotel, account.id, propertyId);

    const rooms = groupByRoomType(mapRoomRates(await this.restClient.getRoomRates(hotel)));
    if (rooms.length === 0) {
      throw new SiteMinderMappingError(
        "SITEMINDER_HOTEL_HAS_NO_ROOM_RATES",
        `SiteMinder has no room rates mapped to our PMS for hotel ${hotel}`
      );
    }

    const base = { integrationAccountId: account.id, domitsPropertyId: propertyId, externalPropertyId: hotel };
    await this.props.upsert({ integrationAccountId: account.id, domitsPropertyId: propertyId, externalPropertyId: hotel, status: ACTIVE });

    let ratePlanCount = 0;
    for (const room of rooms) {
      await this.roomTypes.upsert({ ...base, externalRoomTypeId: room.roomTypeCode, externalRoomTypeName: room.roomTypeName, status: ACTIVE });
      for (const plan of room.ratePlans) {
        await this.ratePlans.upsert({
          ...base,
          externalRoomTypeId: room.roomTypeCode,
          externalRatePlanId: plan.ratePlanCode,
          externalRatePlanName: plan.ratePlanName,
          status: ACTIVE,
        });
        ratePlanCount += 1;
      }
    }
    const deactivated = await this.#deactivateRemoved(base, rooms);

    return { hotelCode: hotel, integrationAccountId: account.id, roomTypes: rooms.length, ratePlans: ratePlanCount, deactivated };
  }

  async #checkOwner(userId, domitsPropertyId) {
    const property = await this.propertyLookup.getDomitsPropertyContext(domitsPropertyId);
    if (!property) {
      throw new SiteMinderMappingError("SITEMINDER_MAPPING_PROPERTY_NOT_FOUND", "Domits property not found");
    }
    if (property.hostId !== userId) {
      throw new SiteMinderMappingError("SITEMINDER_MAPPING_PROPERTY_NOT_OWNED", "Only the owner of this property can map it to SiteMinder");
    }
  }

  async #account(userId) {
    const existing = await this.accounts.findByUserIdAndChannel(userId, SITEMINDER_CHANNEL);
    if (existing) {
      return existing;
    }
    const now = this.now();
    return this.accounts.create({
      id: this.newId(),
      userId,
      channel: SITEMINDER_CHANNEL,
      externalAccountId: this.pmsCode,
      displayName: "SiteMinder",
      status: "CONNECTED",
      credentialsRef: this.credentialsRef,
      lastSuccessfulSyncAt: null,
      lastFailedSyncAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // A SiteMinder hotel code may only feed one Domits property, or two hosts would overwrite each other's inventory.
  async #checkHotelIsFree(hotelCode, accountId, domitsPropertyId) {
    for (const row of await this.props.findByExternalPropertyId(hotelCode)) {
      const owner = await this.accounts.getById(row.integrationAccountId);
      const sameMapping = row.integrationAccountId === accountId && row.domitsPropertyId === domitsPropertyId;
      if (owner?.channel === SITEMINDER_CHANNEL && !sameMapping) {
        throw new SiteMinderMappingError(
          "SITEMINDER_HOTEL_ALREADY_MAPPED",
          `SiteMinder hotel ${hotelCode} is already mapped to another Domits property`
        );
      }
    }
  }

  // Room types and rate plans that SiteMinder no longer returns stop being valid targets.
  async #deactivateRemoved(base, rooms) {
    const roomCodes = new Set(rooms.map((room) => room.roomTypeCode));
    const planKeys = new Set(rooms.flatMap((room) => room.ratePlans.map((plan) => `${room.roomTypeCode}\u0000${plan.ratePlanCode}`)));
    const ofThisHotel = (row) => row.externalPropertyId === base.externalPropertyId && row.domitsPropertyId === base.domitsPropertyId && isActive(row);
    let count = 0;

    for (const row of (await this.roomTypes.listByAccountId(base.integrationAccountId)).filter(ofThisHotel)) {
      if (!roomCodes.has(row.externalRoomTypeId)) {
        await this.roomTypes.upsert({ ...base, externalRoomTypeId: row.externalRoomTypeId, status: INACTIVE });
        count += 1;
      }
    }
    for (const row of (await this.ratePlans.listByAccountId(base.integrationAccountId)).filter(ofThisHotel)) {
      if (!planKeys.has(`${row.externalRoomTypeId}\u0000${row.externalRatePlanId}`)) {
        await this.ratePlans.upsert({ ...base, externalRoomTypeId: row.externalRoomTypeId, externalRatePlanId: row.externalRatePlanId, status: INACTIVE });
        count += 1;
      }
    }
    return count;
  }
}

export default SiteMinderMappingService;
