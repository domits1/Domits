import { escapeXml, otaHeaderAttributes } from "./otaXml.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REMOVE_MAX_STAY = 999;
const FLAGS = ["stopSell", "closedToArrival", "closedToDeparture"];

const isSet = (value) => value !== undefined;

function validateFlag(item, flag, where) {
  if (isSet(item[flag]) && typeof item[flag] !== "boolean") {
    throw new Error(`${where}: ${flag} must be true or false`);
  }
}

function validateStay(value, label, where) {
  if (isSet(value) && value !== null && (!Number.isInteger(value) || value < 1)) {
    throw new Error(`${where}: ${label} must be a whole number of 1 or more`);
  }
}

function validateItem(item, index) {
  const where = `restriction item ${index}`;
  if (!item.roomTypeCode) throw new Error(`${where}: roomTypeCode is required`);
  if (!item.ratePlanCode) throw new Error(`${where}: ratePlanCode is required, SiteMinder only takes restrictions per room rate`);
  if (!ISO_DATE.test(item.start ?? "") || !ISO_DATE.test(item.end ?? "")) {
    throw new Error(`${where}: start and end must be yyyy-mm-dd`);
  }
  if (item.start > item.end) throw new Error(`${where}: start is after end`);

  FLAGS.forEach((flag) => validateFlag(item, flag, where));
  validateStay(item.minStay, "minStay", where);
  if (item.minStay === null) throw new Error(`${where}: minStay cannot be removed, send 1 instead`);
  validateStay(item.maxStay, "maxStay", where);
  if (Number.isInteger(item.minStay) && Number.isInteger(item.maxStay) && item.minStay > item.maxStay) {
    throw new Error(`${where}: minStay is above maxStay`);
  }

  const hasRestriction = FLAGS.some((flag) => isSet(item[flag])) || isSet(item.minStay) || isSet(item.maxStay);
  if (!hasRestriction) throw new Error(`${where}: set at least one restriction`);
}

function assertNoOverlaps(items) {
  const byRoomRate = new Map();
  for (const item of items) {
    const key = `${item.roomTypeCode}\u0000${item.ratePlanCode}`;
    const ranges = byRoomRate.get(key) ?? [];
    for (const other of ranges) {
      if (item.start <= other.end && other.start <= item.end) {
        throw new Error(
          `restrictions for ${item.roomTypeCode}/${item.ratePlanCode} have overlapping dates (${other.start}..${other.end} and ${item.start}..${item.end})`
        );
      }
    }
    ranges.push(item);
    byRoomRate.set(key, ranges);
  }
}

const control = (item) =>
  `<StatusApplicationControl Start="${item.start}" End="${item.end}" InvTypeCode="${escapeXml(item.roomTypeCode)}" RatePlanCode="${escapeXml(item.ratePlanCode)}"/>`;

const status = (closed, restriction) => {
  const type = restriction ? ' Restriction="' + restriction + '"' : "";
  return `<RestrictionStatus${type} Status="${closed ? "Close" : "Open"}"/>`;
};

function lengthsOfStay(item) {
  const stays = [];
  if (isSet(item.minStay)) stays.push(`<LengthOfStay MinMaxMessageType="SetMinLOS" Time="${item.minStay}"/>`);
  if (isSet(item.maxStay)) stays.push(`<LengthOfStay MinMaxMessageType="SetMaxLOS" Time="${item.maxStay ?? REMOVE_MAX_STAY}"/>`);
  return stays.length ? `<LengthsOfStay>${stays.join("")}</LengthsOfStay>` : "";
}

// One AvailStatusMessage holds the stays and the stop sell; CTA and CTD each need their own, because a message
// carries one RestrictionStatus. Each restriction is independent at SiteMinder, so only the ones set are sent.
function toMessages(item) {
  const messages = [];
  const stays = lengthsOfStay(item);
  if (stays || isSet(item.stopSell)) {
    const stopSell = isSet(item.stopSell) ? status(item.stopSell) : "";
    messages.push(`<AvailStatusMessage>${control(item)}${stays}${stopSell}</AvailStatusMessage>`);
  }
  if (isSet(item.closedToArrival)) {
    messages.push(`<AvailStatusMessage>${control(item)}${status(item.closedToArrival, "Arrival")}</AvailStatusMessage>`);
  }
  if (isSet(item.closedToDeparture)) {
    messages.push(`<AvailStatusMessage>${control(item)}${status(item.closedToDeparture, "Departure")}</AvailStatusMessage>`);
  }
  return messages;
}

// items: { roomTypeCode, ratePlanCode, start, end, stopSell?, closedToArrival?, closedToDeparture?, minStay?, maxStay? }
// maxStay: null removes the maximum stay. A restriction that is left out keeps its current value at SiteMinder.
export function buildRestrictionsNotif({ hotelCode, requestorId, items, echoToken, now }) {
  if (!hotelCode) throw new Error("hotelCode is required");
  if (!requestorId) throw new Error("requestorId is required");
  if (!Array.isArray(items) || items.length === 0) throw new Error("at least one restriction item is required");

  items.forEach((item, index) => validateItem(item, index));
  assertNoOverlaps(items);

  return (
    `<OTA_HotelAvailNotifRQ ${otaHeaderAttributes({ echoToken, now })}>` +
    `<POS><Source><RequestorID Type="22" ID="${escapeXml(requestorId)}"/></Source></POS>` +
    `<AvailStatusMessages HotelCode="${escapeXml(hotelCode)}">${items.flatMap(toMessages).join("")}</AvailStatusMessages>` +
    "</OTA_HotelAvailNotifRQ>"
  );
}
