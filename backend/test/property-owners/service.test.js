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

const TITLES = Object.freeze([
  { id: "property-1", title: "Villa Sensual" },
  { id: "property-2", title: "Casa Azul" },
  { id: "property-3", title: "Chalet Noord" },
]);

const titleOf = (propertyId) => TITLES.find(({ id }) => id === propertyId)?.title ?? null;

const property = (propertyId, overrides = {}) => ({
  property_id: propertyId,
  property_title: titleOf(propertyId),
  ownership_basis_points: 5000,
  effective_from: TODAY - 30 * DAY_MS,
  effective_to: null,
  ...overrides,
});

const VALID_BODY = Object.freeze({
  first_name: " Anna ",
  last_name: "de Vries",
  email: "anna@example.com",
  owner_type: "individual",
});

const SHARE_PROPERTY = Object.freeze({ id: "property-1", title: "Villa Sensual" });

const createService = ({
  owners = [],
  shareProperty = SHARE_PROPERTY,
  shareOwners = [],
  savedShares = [],
  ownerById = null,
  assignments = [],
  ownerAssignments = [],
  titles = TITLES,
  clock = CLOCK,
} = {}) => {
  const repository = {
    findOwnersByHost: jest.fn(async () => owners),
    findOwnerByIdAndHost: jest.fn(async () => ownerById),
    findAssignmentsByHost: jest.fn(async () => assignments),
    findAssignmentsByOwnerAndHost: jest.fn(async () => ownerAssignments),
    findPropertyTitlesByIds: jest.fn(async () => titles),
    createOwner: jest.fn(async (record) => ({ id: OWNER_A, ...record })),
    replacePropertyShares: jest.fn(async ({ assertWritable }) => {
      assertWritable({ property: shareProperty, owners: shareOwners });
      return { property: shareProperty, rows: savedShares };
    }),
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

  test("exposes only property_id, property_title, ownership_basis_points, effective_from and effective_to per property", async () => {
    const { service } = createService({ owners: [owner(OWNER_A)], assignments: [assignment(OWNER_A, "property-1")] });

    const [result] = await service.listOwners("host-1");

    expect(Object.keys(result.properties[0]).sort()).toEqual([
      "effective_from",
      "effective_to",
      "ownership_basis_points",
      "property_id",
      "property_title",
    ]);
  });

  test("reads the titles of every assigned property in one query for the caller's host", async () => {
    const { repository, service } = createService({
      owners: [owner(OWNER_A), owner(OWNER_B)],
      assignments: [
        assignment(OWNER_A, "property-1"),
        assignment(OWNER_B, "property-2"),
        assignment(OWNER_B, "property-1"),
      ],
    });

    const result = await service.listOwners("host-1");

    expect(repository.findPropertyTitlesByIds).toHaveBeenCalledTimes(1);
    expect(repository.findPropertyTitlesByIds).toHaveBeenCalledWith(
      ["property-1", "property-2", "property-1"],
      "host-1"
    );
    expect(result.map(({ properties }) => properties.map(({ property_title }) => property_title))).toEqual([
      ["Villa Sensual"],
      ["Casa Azul", "Villa Sensual"],
    ]);
  });

  test("gives a property the titles query did not return a null title", async () => {
    const { service } = createService({
      owners: [owner(OWNER_A)],
      assignments: [assignment(OWNER_A, "property-1"), assignment(OWNER_A, "property-9")],
    });

    const [result] = await service.listOwners("host-1");

    expect(result.properties).toEqual([property("property-1"), property("property-9")]);
    expect(result.properties[1].property_title).toBeNull();
  });

  test("does not read titles when the host has no current assignments", async () => {
    const { repository, service } = createService({ owners: [owner(OWNER_A)] });

    await service.listOwners("host-1");

    expect(repository.findPropertyTitlesByIds).not.toHaveBeenCalled();
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
    expect(repository.findPropertyTitlesByIds).toHaveBeenCalledTimes(1);
    expect(repository.findPropertyTitlesByIds).toHaveBeenCalledWith(["property-1", "property-2"], "host-1");
  });

  test("gives a property the titles query did not return a null title", async () => {
    const { service } = createService({
      ownerById: owner(OWNER_A),
      ownerAssignments: [assignment(OWNER_A, "property-1")],
      titles: [],
    });

    const result = await service.getOwner("host-1", OWNER_A);

    expect(result.properties).toEqual([{ ...property("property-1"), property_title: null }]);
  });

  test("returns an empty properties list for an owner without current assignments, without reading titles", async () => {
    const { repository, service } = createService({ ownerById: owner(OWNER_A) });

    await expect(service.getOwner("host-1", OWNER_A)).resolves.toEqual({ ...owner(OWNER_A), properties: [] });
    expect(repository.findPropertyTitlesByIds).not.toHaveBeenCalled();
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

describe("Service.createOwner", () => {
  const expectedRecord = {
    first_name: "Anna",
    last_name: "de Vries",
    company_name: null,
    email: "anna@example.com",
    phone: null,
    preferred_language: null,
    owner_type: "individual",
    status: "active",
    notes: null,
    host_id: "host-1",
    owner_user_id: null,
    created_at: CLOCK(),
    updated_at: CLOCK(),
  };

  test("saves the validated owner for the caller's host, stamped with the raw clock value", async () => {
    const { repository, service } = createService();

    await service.createOwner("host-1", VALID_BODY);

    expect(repository.createOwner).toHaveBeenCalledTimes(1);
    expect(repository.createOwner).toHaveBeenCalledWith(expectedRecord);
    expect(CLOCK() % DAY_MS).not.toBe(0);
  });

  test("returns the saved owner with an empty properties list and no property_ids", async () => {
    const { service } = createService();

    const created = await service.createOwner("host-1", VALID_BODY);

    expect(created).toEqual({ id: OWNER_A, ...expectedRecord, properties: [] });
    expect(created).not.toHaveProperty("property_ids");
  });

  test("keeps an explicit non-archived status", async () => {
    const { repository, service } = createService();

    await service.createOwner("host-1", { ...VALID_BODY, status: "pending" });

    expect(repository.createOwner).toHaveBeenCalledWith({ ...expectedRecord, status: "pending" });
  });

  test.each([
    ["host_id", { host_id: "host-2" }],
    ["owner_user_id", { owner_user_id: "user-2" }],
    ["id", { id: OWNER_B }],
    ["created_at", { created_at: 1 }],
    ["property_ids", { property_ids: ["property-1"] }],
  ])("rejects a body that sets %s with 400 before any write", async (field, extra) => {
    const { repository, service } = createService();

    await expect(service.createOwner("host-1", { ...VALID_BODY, ...extra })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining(field),
    });
    expect(repository.createOwner).not.toHaveBeenCalled();
  });

  test.each([
    ["null", null],
    ["an array", []],
    ["a string", "owner"],
    ["a number", 42],
    ["an empty object", {}],
    ["an invalid email", { ...VALID_BODY, email: "anna" }],
    ["an unknown owner type", { ...VALID_BODY, owner_type: "partnership" }],
    ["a company without a company name", { ...VALID_BODY, owner_type: "company" }],
    ["the archived status", { ...VALID_BODY, status: "archived" }],
  ])("rejects %s with 400 and never reaches the repository", async (_label, body) => {
    const { repository, service } = createService();

    await expect(service.createOwner("host-1", body)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.createOwner).not.toHaveBeenCalled();
  });
});

describe("Service.setShares", () => {
  const sharesBody = (overrides = {}) => ({
    property_id: "property-1",
    effective_from: TODAY,
    shares: [
      { owner_id: OWNER_A.toUpperCase(), ownership_basis_points: 6000 },
      { owner_id: OWNER_B, ownership_basis_points: 4000 },
    ],
    ...overrides,
  });

  const activeOwners = [
    { id: OWNER_A, status: "active" },
    { id: OWNER_B, status: "pending" },
  ];

  const shareRow = (ownerId, overrides = {}) => ({
    id: `row-${ownerId}`,
    owner_id: ownerId,
    property_id: "property-1",
    host_id: "host-1",
    ownership_basis_points: 5000,
    effective_from: TODAY,
    effective_to: null,
    created_at: CLOCK(),
    updated_at: CLOCK(),
    ...overrides,
  });

  const replaceArgs = (repository) => repository.replacePropertyShares.mock.calls[0][0];

  test("passes today, one clock value, the owner ids and the rows built from the token's host", async () => {
    const { repository, service } = createService({ shareOwners: activeOwners });

    await service.setShares("host-1", sharesBody());

    const { assertWritable, ...args } = replaceArgs(repository);
    expect(typeof assertWritable).toBe("function");
    expect(args).toEqual({
      hostId: "host-1",
      propertyId: "property-1",
      effectiveFrom: TODAY,
      today: TODAY,
      now: CLOCK(),
      ownerIds: [OWNER_A, OWNER_B],
      rows: [
        {
          owner_id: OWNER_A,
          property_id: "property-1",
          host_id: "host-1",
          ownership_basis_points: 6000,
          effective_from: TODAY,
          effective_to: null,
          created_at: CLOCK(),
          updated_at: CLOCK(),
        },
        {
          owner_id: OWNER_B,
          property_id: "property-1",
          host_id: "host-1",
          ownership_basis_points: 4000,
          effective_from: TODAY,
          effective_to: null,
          created_at: CLOCK(),
          updated_at: CLOCK(),
        },
      ],
    });
  });

  test("passes an empty list as no owner ids and no rows", async () => {
    const { repository, service } = createService();

    await service.setShares("host-1", sharesBody({ shares: [] }));

    expect(replaceArgs(repository)).toMatchObject({ ownerIds: [], rows: [] });
  });

  test.each([
    ["an invalid body", null],
    ["a past effective_from", sharesBody({ effective_from: TODAY - DAY_MS })],
    ["a total below 10000", sharesBody({ shares: [{ owner_id: OWNER_A, ownership_basis_points: 9999 }] })],
    ["a host_id in the body", { ...sharesBody(), host_id: "host-2" }],
  ])("rejects %s with 400 before any repository call", async (_label, body) => {
    const { repository, service } = createService();

    await expect(service.setShares("host-1", body)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.replacePropertyShares).not.toHaveBeenCalled();
  });

  test("measures past dates against the UTC day of the clock, not the raw clock value", async () => {
    const { service } = createService({ shareOwners: activeOwners });

    await expect(service.setShares("host-1", sharesBody({ effective_from: TODAY }))).resolves.toMatchObject({
      as_of: TODAY,
    });
  });

  test("rejects a property that is missing or belongs to another host with 404", async () => {
    const { service } = createService({ shareProperty: null, shareOwners: activeOwners });

    await expect(service.setShares("host-1", sharesBody())).rejects.toMatchObject({
      statusCode: 404,
      message: "Property not found.",
    });
  });

  test("rejects an owner that is missing or belongs to another host with 404", async () => {
    const { service } = createService({ shareOwners: [{ id: OWNER_A, status: "active" }] });

    await expect(service.setShares("host-1", sharesBody())).rejects.toMatchObject({
      statusCode: 404,
      message: "Owner not found.",
    });
  });

  test("rejects an archived owner with 409", async () => {
    const { service } = createService({
      shareOwners: [
        { id: OWNER_A, status: "active" },
        { id: OWNER_B, status: "archived" },
      ],
    });

    await expect(service.setShares("host-1", sharesBody())).rejects.toMatchObject({
      statusCode: 409,
      message: "Archived owners cannot receive ownership shares.",
    });
  });

  test("checks the property before the owners", async () => {
    const { service } = createService({ shareProperty: null, shareOwners: [] });

    await expect(service.setShares("host-1", sharesBody())).rejects.toMatchObject({ message: "Property not found." });
  });

  test("accepts an empty list for an existing property without looking for owners", async () => {
    const { service } = createService({ shareOwners: [] });

    await expect(service.setShares("host-1", sharesBody({ shares: [] }))).resolves.toMatchObject({
      current: [],
      upcoming: [],
    });
  });

  test("splits the saved rows into current and upcoming shares relative to today", async () => {
    const savedShares = [
      shareRow(OWNER_A, { effective_from: TODAY - 30 * DAY_MS, effective_to: TODAY + 10 * DAY_MS }),
      shareRow(OWNER_B, { effective_from: TODAY - 30 * DAY_MS, effective_to: TODAY + 10 * DAY_MS }),
      shareRow(OWNER_A, { effective_from: TODAY + 10 * DAY_MS, ownership_basis_points: 6000 }),
      shareRow(OWNER_C, { effective_from: TODAY, effective_to: null }),
    ];
    const { service } = createService({ shareOwners: activeOwners, savedShares });

    const response = await service.setShares("host-1", sharesBody({ effective_from: TODAY + 10 * DAY_MS }));

    expect(response).toStrictEqual({
      property_id: "property-1",
      property_title: "Villa Sensual",
      as_of: TODAY,
      current: [
        { owner_id: OWNER_A, ownership_basis_points: 5000, effective_from: TODAY - 30 * DAY_MS, effective_to: TODAY + 10 * DAY_MS },
        { owner_id: OWNER_B, ownership_basis_points: 5000, effective_from: TODAY - 30 * DAY_MS, effective_to: TODAY + 10 * DAY_MS },
        { owner_id: OWNER_C, ownership_basis_points: 5000, effective_from: TODAY, effective_to: null },
      ],
      upcoming: [
        { owner_id: OWNER_A, ownership_basis_points: 6000, effective_from: TODAY + 10 * DAY_MS, effective_to: null },
      ],
    });
  });
});
