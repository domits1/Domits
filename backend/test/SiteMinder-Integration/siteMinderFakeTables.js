// In-memory stand-ins for the shared channel_integration_* repositories, with the same upsert keys.
export function fakeTables() {
  const accounts = [];
  const props = [];
  const roomTypes = [];
  const ratePlans = [];
  let next = 0;
  const id = () => `id-${(next += 1)}`;

  const upsertInto = (rows, keys, row) => {
    const existing = rows.find((other) => keys.every((key) => other[key] === row[key]));
    if (existing) {
      Object.assign(existing, Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)));
      return existing;
    }
    const created = { id: id(), status: "ACTIVE", ...row };
    rows.push(created);
    return created;
  };

  return {
    rows: { accounts, props, roomTypes, ratePlans },
    accounts: {
      create: async (row) => (accounts.push(row), row),
      getById: async (accountId) => accounts.find((row) => row.id === accountId) ?? null,
      findByUserIdAndChannel: async (userId, channel) => accounts.find((row) => row.userId === userId && row.channel === channel) ?? null,
    },
    props: {
      upsert: async (row) => upsertInto(props, ["integrationAccountId", "domitsPropertyId", "externalPropertyId"], row),
      findByExternalPropertyId: async (code) => props.filter((row) => row.externalPropertyId === code && row.status === "ACTIVE"),
    },
    roomTypes: {
      upsert: async (row) => upsertInto(roomTypes, ["integrationAccountId", "domitsPropertyId", "externalPropertyId", "externalRoomTypeId"], row),
      listByAccountId: async (accountId) => roomTypes.filter((row) => row.integrationAccountId === accountId),
    },
    ratePlans: {
      upsert: async (row) =>
        upsertInto(ratePlans, ["integrationAccountId", "domitsPropertyId", "externalPropertyId", "externalRoomTypeId", "externalRatePlanId"], row),
      listByAccountId: async (accountId) => ratePlans.filter((row) => row.integrationAccountId === accountId),
    },
  };
}

export const PMSXTEST1_ROOM_RATES = [
  { ratePlanName: "Non-Refundable", ratePlanCode: "NonRef1", roomTypeName: "Dormitory Room", roomTypeCode: "DORM", includedAdultOccupancy: 2 },
  { ratePlanName: "Best Available Rate", ratePlanCode: "BAR1", roomTypeName: "Dormitory Room", roomTypeCode: "DORM", includedAdultOccupancy: 2 },
  { ratePlanName: "Best Available Rate", ratePlanCode: "BAR", roomTypeName: "Family Room", roomTypeCode: "FAM", includedAdultOccupancy: 2 },
];
