import { SITEMINDER_CHANNEL } from "../util/siteMinderConfig.js";
import { SiteMinderMappingError } from "./siteMinderMappingService.js";

const isActive = (row) => String(row?.status ?? "").toUpperCase() === "ACTIVE";
const planKey = (roomTypeCode, ratePlanCode) => `${roomTypeCode}\u0000${ratePlanCode}`;

// SiteMinder answers Success for room types, rate plans and currencies it does not know (seen in the sandbox),
// so nothing reaches it unless the codes are in the active mapping of the hotel and rates use our currency.
export class SiteMinderInventoryService {
  constructor({ accounts, props, roomTypes, ratePlans, availabilityPusher, restrictionsPusher, ratesPusher, currency }) {
    Object.assign(this, { accounts, props, roomTypes, ratePlans, availabilityPusher, restrictionsPusher, ratesPusher, currency });
  }

  async pushAvailability({ hotelCode, items }) {
    const mapping = await this.#mapping(hotelCode);
    this.#checkCodes(mapping, items, { withRatePlan: false });
    return this.availabilityPusher.push({ hotelCode, items });
  }

  async pushRestrictions({ hotelCode, items }) {
    const mapping = await this.#mapping(hotelCode);
    this.#checkCodes(mapping, items, { withRatePlan: true });
    return this.restrictionsPusher.push({ hotelCode, items });
  }

  async pushRates({ hotelCode, items }) {
    const mapping = await this.#mapping(hotelCode);
    this.#checkCodes(mapping, items, { withRatePlan: true });
    const wrong = (items ?? []).filter((item) => item.currency !== undefined && item.currency !== this.currency);
    if (wrong.length) {
      throw new SiteMinderMappingError(
        "SITEMINDER_WRONG_CURRENCY",
        `Rates must be in ${this.currency}, got ${[...new Set(wrong.map((item) => item.currency))].join(", ")}`
      );
    }
    return this.ratesPusher.push({ hotelCode, items: items.map((item) => ({ ...item, currency: this.currency })) });
  }

  async #mapping(hotelCode) {
    let property = null;
    for (const row of await this.props.findByExternalPropertyId(hotelCode)) {
      const account = await this.accounts.getById(row.integrationAccountId);
      if (account?.channel === SITEMINDER_CHANNEL) {
        property = row;
        break;
      }
    }
    if (!property) {
      throw new SiteMinderMappingError("SITEMINDER_HOTEL_NOT_MAPPED", `SiteMinder hotel ${hotelCode} is not mapped to a Domits property`);
    }
    const ofThisHotel = (row) => row.externalPropertyId === hotelCode && row.domitsPropertyId === property.domitsPropertyId && isActive(row);
    const rooms = (await this.roomTypes.listByAccountId(property.integrationAccountId)).filter(ofThisHotel);
    const plans = (await this.ratePlans.listByAccountId(property.integrationAccountId)).filter(ofThisHotel);
    return {
      roomTypes: new Set(rooms.map((row) => row.externalRoomTypeId)),
      ratePlans: new Set(plans.map((row) => planKey(row.externalRoomTypeId, row.externalRatePlanId))),
    };
  }

  #checkCodes(mapping, items, { withRatePlan }) {
    const unknown = new Set();
    for (const item of Array.isArray(items) ? items : []) {
      if (!mapping.roomTypes.has(item.roomTypeCode)) {
        unknown.add(`room type ${item.roomTypeCode}`);
      } else if (withRatePlan && !mapping.ratePlans.has(planKey(item.roomTypeCode, item.ratePlanCode))) {
        unknown.add(`rate plan ${item.roomTypeCode}/${item.ratePlanCode}`);
      }
    }
    if (unknown.size) {
      throw new SiteMinderMappingError("SITEMINDER_UNKNOWN_CODES", `Not in the SiteMinder mapping of this hotel: ${[...unknown].join(", ")}`);
    }
  }
}

export default SiteMinderInventoryService;
