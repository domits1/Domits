const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

export function mapRoomRates(response, { logger = console } = {}) {
  if (!Array.isArray(response)) {
    throw new TypeError("SiteMinder room-rates response is not a list");
  }
  const roomRates = response
    .map((entry) => ({
      roomTypeCode: text(entry?.roomTypeCode),
      roomTypeName: text(entry?.roomTypeName),
      ratePlanCode: text(entry?.ratePlanCode),
      ratePlanName: text(entry?.ratePlanName),
      includedAdultOccupancy: Number.isInteger(entry?.includedAdultOccupancy) ? entry.includedAdultOccupancy : null,
    }))
    .filter((entry) => entry.roomTypeCode);
  const skipped = response.length - roomRates.length;
  if (skipped > 0) {
    logger.warn(
      JSON.stringify({ event: "SITEMINDER_ROOM_RATES_SKIPPED", reason: "missing roomTypeCode", skipped, total: response.length })
    );
  }
  return roomRates;
}

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
