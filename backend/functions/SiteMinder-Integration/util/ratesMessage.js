import { escapeXml, otaHeaderAttributes } from "./otaXml.js";
import { isIsoDate, toAmount } from "./otaValues.js";

const CURRENCY = /^[A-Z]{3}$/;

function validateItem(item, index) {
  const where = `rate item ${index}`;
  if (!item.roomTypeCode) throw new Error(`${where}: roomTypeCode is required`);
  if (!item.ratePlanCode) throw new Error(`${where}: ratePlanCode is required, SiteMinder only takes rates per room rate`);
  if (!isIsoDate(item.start) || !isIsoDate(item.end)) {
    throw new Error(`${where}: start and end must be real dates as yyyy-mm-dd`);
  }
  if (item.start > item.end) throw new Error(`${where}: start is after end`);
  if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0) {
    throw new Error(`${where}: amount must be a number above 0`);
  }
  if (!CURRENCY.test(item.currency ?? "")) {
    throw new Error(`${where}: currency must be a 3-letter code such as EUR, SiteMinder does not convert it`);
  }
}

const roomRateKey = (item) => `${item.roomTypeCode}\u0000${item.ratePlanCode}`;

// One RateAmountMessage per room rate, with one Rate per date range, in the order they were given.
function groupByRoomRate(items) {
  const groups = new Map();
  for (const item of items) {
    const key = roomRateKey(item);
    const group = groups.get(key) ?? { roomTypeCode: item.roomTypeCode, ratePlanCode: item.ratePlanCode, rates: [] };
    for (const other of group.rates) {
      if (item.start <= other.end && other.start <= item.end) {
        throw new Error(
          `rates for ${item.roomTypeCode}/${item.ratePlanCode} have overlapping dates (${other.start}..${other.end} and ${item.start}..${item.end})`
        );
      }
    }
    group.rates.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

const toRate = (rate) =>
  `<Rate CurrencyCode="${rate.currency}" Start="${rate.start}" End="${rate.end}">` +
  `<BaseByGuestAmts><BaseByGuestAmt AmountBeforeTax="${toAmount(rate.amount)}"/></BaseByGuestAmts>` +
  "</Rate>";

const toMessage = (group) =>
  "<RateAmountMessage>" +
  `<StatusApplicationControl InvTypeCode="${escapeXml(group.roomTypeCode)}" RatePlanCode="${escapeXml(group.ratePlanCode)}"/>` +
  `<Rates>${group.rates.map(toRate).join("")}</Rates>` +
  "</RateAmountMessage>";

// Per Day Pricing: one price per night before tax (the Domits base rate is net, without VAT or local taxes),
// per room rate and date range. SiteMinder accepts AmountBeforeTax or AmountAfterTax.
// items: { roomTypeCode, ratePlanCode, start, end, amount, currency }
export function buildRatesNotif({ hotelCode, requestorId, items, echoToken, now }) {
  if (!hotelCode) throw new Error("hotelCode is required");
  if (!requestorId) throw new Error("requestorId is required");
  if (!Array.isArray(items) || items.length === 0) throw new Error("at least one rate item is required");

  items.forEach((item, index) => validateItem(item, index));
  const groups = groupByRoomRate(items);

  return (
    `<OTA_HotelRateAmountNotifRQ ${otaHeaderAttributes({ echoToken, now })}>` +
    `<POS><Source><RequestorID Type="22" ID="${escapeXml(requestorId)}"/></Source></POS>` +
    `<RateAmountMessages HotelCode="${escapeXml(hotelCode)}">${groups.map(toMessage).join("")}</RateAmountMessages>` +
    "</OTA_HotelRateAmountNotifRQ>"
  );
}
