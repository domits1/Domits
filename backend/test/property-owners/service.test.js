jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const { Service } = require("../../functions/property-owners/business/service/service.js");

const OWNER_A = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const OWNER_B = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const OWNER_C = "0a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d";
const DAY_MS = 86400000;
const TODAY = Date.UTC(2026, 6, 1);
const CLOCK = () => Date.parse("2026-07-01T15:30:00Z");

const owner = (id, overrides = {}) => ({
  id,
  host_id: "host-1",
  first_name: "Anna",
  last_name: "de Vries",
  status: "active",
  ...overrides,
});

const assignment = (ownerId, propertyId, overrides = {}) => ({
  id: `${ownerId}-${propertyId}`,
  owner_id: ownerId,
  property_id: propertyId,
  host_id: "host-1",
  ownership_basis_points: 5000,
  effective_from: TODAY - 30 * DAY_MS,
  effective_to: null,
  created_at: TODAY - 30 * DAY_MS,
  updated_at: TODAY - 30 * DAY_MS,
  ...overrides,
});

const property = (propertyId, overrides = {}) => ({
  property_id: propertyId,
  ownership_basis_points: 5000,
  effective_from: TODAY - 30 * DAY_MS,
  effective_to: null,
  ...overrides,
});

const createService = ({
  owners = [],
  ownerById = null,
  assignments = [],
  ownerAssignments = [],
  clock = CLOCK,
} = {}) => {
  const repository = {
    findOwnersByHost: jest.fn(async () => owners),
    findOwnerByIdAndHost: jest.fn(async () => ownerById),
    findAssignmentsByHost: jest.fn(async () => assignments),
    findAssignmentsByOwnerAndHost: jest.fn(async () => ownerAssignments),
  };
  return { repository, service: new Service({ repository, clock }) };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Service today", () => {
  test.each([
    ["in the afternoon", "2026-07-01T15:30:00Z"],
    ["exactly at midnight", "2026-07-01T00:00:00Z"],
    ["one millisecond before the next day", "2026-07-01T23:59:59.999Z"],
  ])("passes UTC midnight of the injected clock when the clock is %s", async (_label, instant) => {
    const { repository, service } = createService({ clock: () => Date.parse(instant), ownerById: owner(OWNER_A) });

    await service.listOwners("host-1");
    await service.getOwner("host-1", OWNER_A);

    expect(repository.findAssignmentsByHost).toHaveBeenCalledWith("host-1", TODAY);
    expect(repository.findAssignmentsByOwnerAndHost).toHaveBeenCalledWith(OWNER_A, "host-1", TODAY);
  });

  test("uses Date.now when no clock is injected", async () => {
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-07-01T09:00:00Z"));
    const repository = {
      findOwnersByHost: jest.fn(async () => []),
      findAssignmentsByHost: jest.fn(async () => []),
    };

    await new Service({ repository }).listOwners("host-1");

    expect(repository.findAssignmentsByHost).toHaveBeenCalledWith("host-1", TODAY);
  });
});

describe("Service.listOwners", () => {
  test("reads owners and current assignments for the caller's host only", async () => {
    const { repository, service } = createService();

    await service.listOwners("host-1");

    expect(repository.findOwnersByHost).toHaveBeenCalledWith("host-1");
    expect(repository.findAssignmentsByHost).toHaveBeenCalledWith("host-1", TODAY);
  });

  test("adds each owner's properties in the repository order and gives unassigned owners an empty list", async () => {
    const { service } = createService({
      owners: [owner(OWNER_B, { last_name: "Bakker" }), owner(OWNER_A), owner(OWNER_C, { last_name: "Visser" })],
      assignments: [
        assignment(OWNER_A, "property-1", { ownership_basis_points: 6000 }),
        assignment(OWNER_B, "property-2", { ownership_basis_points: 10000 }),
        assignment(OWNER_A, "property-3", { effective_from: TODAY, effective_to: TODAY + 90 * DAY_MS }),
      ],
    });

    const result = await service.listOwners("host-1");

    expect(result.map(({ id, properties }) => [id, properties])).toEqual([
      [OWNER_B, [property("property-2", { ownership_basis_points: 10000 })]],
      [
        OWNER_A,
        [
          property("property-1", { ownership_basis_points: 6000 }),
          property("property-3", { effective_from: TODAY, effective_to: TODAY + 90 * DAY_MS }),
        ],
      ],
      [OWNER_C, []],
    ]);
  });

  test("returns exactly the owner fields plus properties, and never property_ids", async () => {
    const stored = owner(OWNER_A, { email: "anna@example.com", notes: null });
    const { service } = createService({ owners: [stored], assignments: [assignment(OWNER_A, "property-1")] });

    const [result] = await service.listOwners("host-1");

    expect(result).toEqual({ ...stored, properties: [property("property-1")] });
    expect(result).not.toHaveProperty("property_ids");
  });

  test("exposes only property_id, ownership_basis_points, effective_from and effective_to per property", async () => {
    const { service } = createService({ owners: [owner(OWNER_A)], assignments: [assignment(OWNER_A, "property-1")] });

    const [result] = await service.listOwners("host-1");

    expect(Object.keys(result.properties[0]).sort()).toEqual([
      "effective_from",
      "effective_to",
      "ownership_basis_points",
      "property_id",
    ]);
  });

  test("includes archived owners", async () => {
    const { service } = createService({
      owners: [owner(OWNER_A, { status: "archived" }), owner(OWNER_B, { status: "active" })],
    });

    const result = await service.listOwners("host-1");

    expect(result.map(({ status }) => status)).toEqual(["archived", "active"]);
  });

  test("ignores an assignment whose owner is not in the list", async () => {
    const { service } = createService({
      owners: [owner(OWNER_A)],
      assignments: [assignment(OWNER_B, "property-9")],
    });

    const result = await service.listOwners("host-1");

    expect(result).toEqual([{ ...owner(OWNER_A), properties: [] }]);
  });

  test("returns an empty list when the host has no owners", async () => {
    const { service } = createService();

    await expect(service.listOwners("host-1")).resolves.toEqual([]);
  });
});

describe("Service.getOwner", () => {
  test("returns the owner with its current properties", async () => {
    const { repository, service } = createService({
      ownerById: owner(OWNER_A),
      ownerAssignments: [
        assignment(OWNER_A, "property-1", { ownership_basis_points: 2500 }),
        assignment(OWNER_A, "property-2", { effective_from: TODAY }),
      ],
    });

    const result = await service.getOwner("host-1", OWNER_A);

    expect(result).toEqual({
      ...owner(OWNER_A),
      properties: [
        property("property-1", { ownership_basis_points: 2500 }),
        property("property-2", { effective_from: TODAY }),
      ],
    });
    expect(result).not.toHaveProperty("property_ids");
    expect(repository.findOwnerByIdAndHost).toHaveBeenCalledWith(OWNER_A, "host-1");
    expect(repository.findAssignmentsByOwnerAndHost).toHaveBeenCalledWith(OWNER_A, "host-1", TODAY);
  });

  test("returns an empty properties list for an owner without current assignments", async () => {
    const { service } = createService({ ownerById: owner(OWNER_A) });

    await expect(service.getOwner("host-1", OWNER_A)).resolves.toEqual({ ...owner(OWNER_A), properties: [] });
  });

  test.each([undefined, null, "", "owner-1", `${OWNER_A}x`, 42])(
    "rejects the owner id %p with 400 before any query",
    async (id) => {
      const { repository, service } = createService({ ownerById: owner(OWNER_A) });

      await expect(service.getOwner("host-1", id)).rejects.toMatchObject({ statusCode: 400 });
      expect(repository.findOwnerByIdAndHost).not.toHaveBeenCalled();
      expect(repository.findAssignmentsByOwnerAndHost).not.toHaveBeenCalled();
    }
  );

  test("returns 404 when the owner does not exist or belongs to another host", async () => {
    const { repository, service } = createService({ ownerById: null });

    await expect(service.getOwner("host-2", OWNER_A)).rejects.toMatchObject({
      statusCode: 404,
      message: "Owner not found.",
    });
    expect(repository.findOwnerByIdAndHost).toHaveBeenCalledWith(OWNER_A, "host-2");
    expect(repository.findAssignmentsByOwnerAndHost).not.toHaveBeenCalled();
  });
});
