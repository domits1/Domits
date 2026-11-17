import { escapeXml, otaHeaderAttributes } from "./otaXml.js";
import { isIsoDate } from "./otaValues.js";


function validateItem(item, index) {
  const where = `availability item ${index}`;
  if (!item.roomTypeCode) throw new Error(`${where}: roomTypeCode is required`);
  if (!isIsoDate(item.start) || !isIsoDate(item.end)) {
    throw new Error(`${where}: start and end must be real dates as yyyy-mm-dd`);
  }
  if (item.start > item.end) throw new Error(`${where}: start is after end`);
  if (!Number.isInteger(item.bookingLimit) || item.bookingLimit < 0) {
    throw new Error(`${where}: bookingLimit must be a whole number of 0 or more`);
  }
}


function assertNoOverlaps(items) {
  const byRoom = new Map();
  for (const item of items) {
    const ranges = byRoom.get(item.roomTypeCode) ?? [];
    for (const other of ranges) {
      if (item.start <= other.end && other.start <= item.end) {
        throw new Error(`availability for ${item.roomTypeCode} has overlapping dates (${other.start}..${other.end} and ${item.start}..${item.end})`);
      }
    }
    ranges.push(item);
    byRoom.set(item.roomTypeCode, ranges);
  }
}

export function buildAvailabilityNotif({ hotelCode, requestorId, items, echoToken, now }) {
  if (!hotelCode) throw new Error("hotelCode is required");
  if (!requestorId) throw new Error("requestorId is required");
  if (!Array.isArray(items) || items.length === 0) throw new Error("at least one availability item is required");

  items.forEach((item, index) => validateItem(item, index));
  assertNoOverlaps(items);

  const messages = items
    .map(
      (item) =>
        `<AvailStatusMessage BookingLimit="${item.bookingLimit}">` +
        `<StatusApplicationControl Start="${item.start}" End="${item.end}" InvTypeCode="${escapeXml(item.roomTypeCode)}"/>` +
        "</AvailStatusMessage>"
    )
    .join("");

  return (
    `<OTA_HotelAvailNotifRQ ${otaHeaderAttributes({ echoToken, now })}>` +
    `<POS><Source><RequestorID Type="22" ID="${escapeXml(requestorId)}"/></Source></POS>` +
    `<AvailStatusMessages HotelCode="${escapeXml(hotelCode)}">${messages}</AvailStatusMessages>` +
    "</OTA_HotelAvailNotifRQ>"
  );
}