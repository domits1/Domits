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

export class SiteMinderMappingService {
  constructor({ restClient, accounts, props, roomTypes, ratePlans, propertyLookup, pmsCode, credentialsRef, now = () => Date.now(), newId, logger = console }) {
    Object.assign(this, { restClient, accounts, props, roomTypes, ratePlans, propertyLookup, pmsCode, credentialsRef, now, newId, logger });
  }

  async syncRoomType({ userId, domitsPropertyId, hotelCode, roomTypeCode }) {
    const owner = requireText(userId, "userId");
    const propertyId = requireText(domitsPropertyId, "domitsPropertyId");
    const hotel = requireText(hotelCode, "hotelCode");
    const roomCode = requireText(roomTypeCode, "roomTypeCode");

    await this.#checkOwner(owner, propertyId);
    const account = await this.#account(owner);
    await this.#checkHotelIsFree(hotel, account.id);
    await this.#checkRoomIsFree({ accountId: account.id, hotel, roomCode, propertyId });

    const roomRates = await this.restClient.getRoomRates(hotel);
    const rooms = groupByRoomType(mapRoomRates(roomRates, { logger: this.logger, hotelCode: hotel }));
    if (rooms.length === 0) {
      throw new SiteMinderMappingError(
        "SITEMINDER_HOTEL_HAS_NO_ROOM_RATES",
        `SiteMinder has no room rates mapped to our PMS for hotel ${hotel}`
      );
    }
    const room = rooms.find((candidate) => candidate.roomTypeCode === roomCode);
    if (!room) {
      throw new SiteMinderMappingError("SITEMINDER_ROOM_TYPE_NOT_FOUND", `SiteMinder hotel ${hotel} has no room type ${roomCode}`);
    }

    const base = { integrationAccountId: account.id, domitsPropertyId: propertyId, externalPropertyId: hotel };
    await this.props.upsert({ ...base, status: ACTIVE });
    await this.roomTypes.upsert({ ...base, externalRoomTypeId: room.roomTypeCode, externalRoomTypeName: room.roomTypeName, status: ACTIVE });
    for (const plan of room.ratePlans) {
      await this.ratePlans.upsert({
        ...base,
        externalRoomTypeId: room.roomTypeCode,
        externalRatePlanId: plan.ratePlanCode,
        externalRatePlanName: plan.ratePlanName,
        status: ACTIVE,
      });
    }
    const deactivated = await this.#deactivateRemoved(base, [room]);

    return {
      hotelCode: hotel,
      roomTypeCode: room.roomTypeCode,
      integrationAccountId: account.id,
      ratePlans: room.ratePlans.length,
      deactivated,
    };
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

  async #checkHotelIsFree(hotelCode, accountId) {
    for (const row of await this.props.findByExternalPropertyId(hotelCode)) {
      const owner = await this.accounts.getById(row.integrationAccountId);
      if (owner?.channel === SITEMINDER_CHANNEL && row.integrationAccountId !== accountId) {
        throw new SiteMinderMappingError("SITEMINDER_HOTEL_ALREADY_MAPPED", `SiteMinder hotel ${hotelCode} belongs to another Domits host`);
      }
    }
  }

  async #checkRoomIsFree({ accountId, hotel, roomCode, propertyId }) {
    const taken = (await this.roomTypes.listByAccountId(accountId)).find(
      (row) => row.externalPropertyId === hotel && row.externalRoomTypeId === roomCode && row.domitsPropertyId !== propertyId && isActive(row)
    );
    if (taken) {
      throw new SiteMinderMappingError(
        "SITEMINDER_ROOM_TYPE_ALREADY_MAPPED",
        `SiteMinder room type ${roomCode} of hotel ${hotel} is already linked to another Domits property`
      );
    }
  }

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
