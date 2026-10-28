jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const { AuthManager } = require("../../functions/PropertyHandler/auth/authManager.js");

const HOST_ID = "host-1";
const CALLER_ID = "caller-1";

const membership = (overrides) => ({
  host_id: HOST_ID,
  member_user_id: CALLER_ID,
  role: "Financial Manager",
  status: "active",
  ...overrides,
});

const buildAuthManager = (rows) => {
  Database.getInstance.mockResolvedValue({
    getRepository: () => ({
      findOne: async ({ where }) =>
        rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
    }),
  });
  return new AuthManager();
};

describe("AuthManager.authorizeHostAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows the owner without a membership lookup", async () => {
    const authManager = buildAuthManager([]);

    await expect(authManager.authorizeHostAccess(CALLER_ID, CALLER_ID)).resolves.toBe(CALLER_ID);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });

  it("allows an active team member of any role", async () => {
    const authManager = buildAuthManager([membership()]);

    await expect(authManager.authorizeHostAccess(CALLER_ID, HOST_ID)).resolves.toBe(CALLER_ID);
  });

  it.each([undefined, null, ""])("rejects a falsy host id %p without a membership lookup", async (hostId) => {
    const authManager = buildAuthManager([membership()]);

    await expect(authManager.authorizeHostAccess(CALLER_ID, hostId)).rejects.toMatchObject({
      statusCode: 403,
      callerId: CALLER_ID,
    });
    expect(Database.getInstance).not.toHaveBeenCalled();
  });

  it.each([
    ["a pending member", membership({ status: "pending" })],
    ["a revoked member", membership({ status: "revoked" })],
    ["a member of another host", membership({ host_id: "other-host" })],
  ])("rejects %s with a 403 that carries the caller id", async (_label, row) => {
    const authManager = buildAuthManager([row]);

    await expect(authManager.authorizeHostAccess(CALLER_ID, HOST_ID)).rejects.toMatchObject({
      statusCode: 403,
      callerId: CALLER_ID,
    });
  });
});
