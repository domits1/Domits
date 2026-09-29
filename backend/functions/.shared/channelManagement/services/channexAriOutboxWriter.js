import { ChannelIntegrationAccount } from "database/models/unified/integrations/ChannelIntegrationAccount";
import { ChannelIntegrationProperty } from "database/models/unified/integrations/ChannelIntegrationProperty";

import ChannexAriOutboxRepository from "../repositories/channexAriOutboxRepository.js";
import { CHANNEX_ARI_OUTBOX_KIND } from "../utils/channexAriOutboxConstants.js";

const FORWARD_SYNC_DAYS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const toIsoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
// The outbox stores dates as YYYYMMDD integers (design D6); integers of that shape
// compare in date order, so clipping is a plain Math.max.
const isoToDateInt = (isoDate) => Number(String(isoDate).slice(0, 10).replaceAll("-", ""));

export const buildForwardSyncRange = (now = Date.now()) => ({
  dateFrom: toIsoDate(now),
  dateTo: toIsoDate(now + (FORWARD_SYNC_DAYS - 1) * DAY_MS),
});

// Writes the "this changed" row inside the caller's transaction, so the row and the
// domain change commit together or not at all (design D8). It never calls Channex.
export default class ChannexAriOutboxWriter {
  constructor({ outbox = new ChannexAriOutboxRepository(), now = () => Date.now() } = {}) {
    this.outbox = outbox;
    this.now = now;
  }

  async isMappedToChannex(manager, domitsPropertyId) {
    const count = await manager
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .innerJoin(ChannelIntegrationAccount, "a", "a.id = p.integrationAccountId")
      .where("p.domitsPropertyId = :d", { d: domitsPropertyId })
      .andWhere("p.status = :s", { s: "ACTIVE" })
      .andWhere("a.channel = :c", { c: "CHANNEX" })
      .getCount();
    return count > 0;
  }

  async enqueueChannexAriChange(manager, { domitsPropertyId, changeTypes, dateFrom, dateTo, source }) {
    const types = Array.isArray(changeTypes) ? changeTypes.filter(Boolean) : [];
    if (!types.length) return false;

    const now = this.now();
    const today = isoToDateInt(toIsoDate(now));
    const to = isoToDateInt(dateTo);
    // Channex refuses past dates, so a change that lies wholly in the past has nothing to send.
    if (to < today) return false;
    // Only mapped properties get rows (design D10); the go-live full sync covers the rest.
    if (!(await this.isMappedToChannex(manager, domitsPropertyId))) return false;

    await this.outbox.insert(manager, {
      domitsPropertyId,
      kind: CHANNEX_ARI_OUTBOX_KIND.CHANGE,
      changeTypes: types,
      dateFrom: Math.max(isoToDateInt(dateFrom), today),
      dateTo: to,
      source,
      now,
    });
    return true;
  }
}
