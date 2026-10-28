const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

// One entry per room type and rate plan that the hotel mapped to our PMS on the SiteMinder Platform.
// roomTypeCode is used as both RoomTypeCode and InvTypeCode in the SOAP messages.
export function mapRoomRates(response) {
  if (!Array.isArray(response)) {
    throw new TypeError("SiteMinder room-rates response is not a list");
  }
  return response
    .map((entry) => ({
      roomTypeCode: text(entry?.roomTypeCode),
      roomTypeName: text(entry?.roomTypeName),
      ratePlanCode: text(entry?.ratePlanCode),
      ratePlanName: text(entry?.ratePlanName),
      includedAdultOccupancy: Number.isInteger(entry?.includedAdultOccupancy) ? entry.includedAdultOccupancy : null,
    }))
    .filter((entry) => entry.roomTypeCode);
}

// The room types with their rate plans, the shape the mapping screen needs.
export function groupByRoomType(roomRates) {
  const rooms = new Map();
  for (const rate of roomRates) {
    const room = rooms.get(rate.roomTypeCode) ?? { roomTypeCode: rate.roomTypeCode, roomTypeName: rate.roomTypeName, ratePlans: [] };
    if (rate.ratePlanCode && !room.ratePlans.some((plan) => plan.ratePlanCode === rate.ratePlanCode)) {
      room.ratePlans.push({
        ratePlanCode: rate.ratePlanCode,
        ratePlanName: rate.ratePlanName,
        includedAdultOccupancy: rate.includedAdultOccupancy,
      });
    }
    rooms.set(rate.roomTypeCode, room);
  }
  return [...rooms.values()];
}
