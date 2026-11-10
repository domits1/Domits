import { XMLParser } from "fast-xml-parser";

const LIST_ELEMENTS = new Set([
  "HotelReservation",
  "RoomStay",
  "ResGuest",
  "ProfileInfo",
  "GuestCount",
  "Source",
  "UniqueID",
  "Telephone",
  "RoomType",
  "RatePlan",
]);

const AGE = { ADULT: "10", CHILD: "8", INFANT: "7" };
const UNIQUE_ID_TYPE = { RESERVATION: "14", MESSAGE: "16" };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: true,
  textNodeName: "#text",
  isArray: (name) => LIST_ELEMENTS.has(name),
});

const list = (value) => value ?? [];

const text = (value) => {
  const raw = typeof value === "object" && value !== null ? value["#text"] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
};

const amount = (value) => (value === undefined ? null : Number(value));

const toTotal = (total) =>
  total
    ? {
        amountBeforeTax: amount(total.AmountBeforeTax),
        amountAfterTax: amount(total.AmountAfterTax),
        currency: total.CurrencyCode ?? null,
      }
    : null;

const countFor = (guestCounts, ageCode) =>
  list(guestCounts?.GuestCount)
    .filter((guestCount) => guestCount.AgeQualifyingCode === ageCode)
    .reduce((sum, guestCount) => sum + Number(guestCount.Count ?? 0), 0);

const uniqueId = (reservation, type) => text(list(reservation.UniqueID).find((id) => id.Type === type)?.ID);

const primaryChannel = (pos) => {
  const channels = list(pos?.Source)
    .map((source) => source.BookingChannel)
    .filter(Boolean);
  const channel = channels.find((candidate) => candidate.Primary === "true") ?? channels[0];
  return channel ? { code: channel.CompanyName?.Code ?? null, name: text(channel.CompanyName) } : null;
};

const toRoom = (roomStay) => ({
  roomTypeCode: text(list(roomStay.RoomTypes?.RoomType)[0]?.RoomTypeCode),
  ratePlanCodes: [
    ...new Set(
      list(roomStay.RatePlans?.RatePlan)
        .map((ratePlan) => text(ratePlan.RatePlanCode))
        .filter(Boolean)
    ),
  ],
  arrival: roomStay.TimeSpan?.Start ?? null,
  departure: roomStay.TimeSpan?.End ?? null,
  adults: countFor(roomStay.GuestCounts, AGE.ADULT),
  children: countFor(roomStay.GuestCounts, AGE.CHILD),
  infants: countFor(roomStay.GuestCounts, AGE.INFANT),
  total: toTotal(roomStay.Total),
});

const toGuest = (resGuests) => {
  const guests = list(resGuests?.ResGuest);
  const guest = guests.find((candidate) => candidate.PrimaryIndicator === "true") ?? guests[0];
  const customer = list(guest?.Profiles?.ProfileInfo)[0]?.Profile?.Customer;
  if (!customer) {
    return null;
  }
  return {
    firstName: text(customer.PersonName?.GivenName),
    lastName: text(customer.PersonName?.Surname),
    email: text(customer.Email),
    phone: text(list(customer.Telephone)[0]?.PhoneNumber),
  };
};

const toReservation = (reservation) => {
  const siteMinderId = uniqueId(reservation, UNIQUE_ID_TYPE.RESERVATION);
  const messageId = uniqueId(reservation, UNIQUE_ID_TYPE.MESSAGE);
  if (!siteMinderId || !messageId) {
    throw new Error("SiteMinder reservation is missing its id or message id");
  }
  const roomStays = list(reservation.RoomStays?.RoomStay);
  return {
    status: reservation.ResStatus ?? null,
    siteMinderId,
    messageId,
    createdAt: reservation.CreateDateTime ?? null,
    lastModifiedAt: reservation.LastModifyDateTime ?? null,
    hotelCode:
      reservation.ResGlobalInfo?.BasicPropertyInfo?.HotelCode ?? roomStays[0]?.BasicPropertyInfo?.HotelCode ?? null,
    channel: primaryChannel(reservation.POS),
    rooms: roomStays.map(toRoom),
    guest: toGuest(reservation.ResGuests),
    total: toTotal(reservation.ResGlobalInfo?.Total),
  };
};

export function readReservations(xml) {
  const source = String(xml ?? "");
  if (/<!DOCTYPE/i.test(source)) {
    throw new Error("SiteMinder reservations response must not contain a DOCTYPE");
  }
  const response = parser.parse(source)?.Envelope?.Body?.OTA_ResRetrieveRS;
  return list(response?.ReservationsList?.HotelReservation).map(toReservation);
}
