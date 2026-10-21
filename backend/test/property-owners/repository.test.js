jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const { DataSource, FindOperator } = require("typeorm");
const Database = require("database").default;
const { Property_Owner } = require("database/models/Property_Owner");
const { Property_Owner_Property } = require("database/models/Property_Owner_Property");
const { Repository } = require("../../functions/property-owners/data/repository.js");

const OWNER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const DAY_MS = 86400000;
const TODAY = Date.UTC(2026, 6, 1);

const createDataSource = ({ owners = [], owner = null, assignments = [] } = {}) => {
  const ownerRepository = {
    find: jest.fn(async () => owners),
    findOne: jest.fn(async () => owner),
  };
  const assignmentRepository = {
    find: jest.fn(async () => assignments),
  };
  const repositories = new Map([
    [Property_Owner, ownerRepository],
    [Property_Owner_Property, assignmentRepository],
  ]);
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn((entity) => repositories.get(entity)) });
  return { ownerRepository, assignmentRepository };
};

const matchesCondition = (value, condition) => {
  if (!(condition instanceof FindOperator)) return value === condition;
  switch (condition.type) {
    case "lessThanOrEqual":
      return value !== null && value <= condition.value;
    case "moreThan":
      return value !== null && value > condition.value;
    case "isNull":
      return value === null;
    default:
      throw new Error(`Unsupported operator ${condition.type}`);
  }
};

const matchesWhere = (row, where) =>
  [where]
    .flat()
    .some((branch) => Object.entries(branch).every(([column, condition]) => matchesCondition(row[column], condition)));

const assignmentRow = (label, overrides = {}) => ({
  label,
  owner_id: OWNER_ID,
  host_id: "host-1",
  effective_from: TODAY - 30 * DAY_MS,
  effective_to: null,
  ...overrides,
});

const PERIOD_ROWS = [
  assignmentRow("open since last month"),
  assignmentRow("closed yesterday", { effective_to: TODAY - DAY_MS }),
  assignmentRow("ending exactly today", { effective_to: TODAY }),
  assignmentRow("ending tomorrow", { effective_to: TODAY + DAY_MS }),
  assignmentRow("starting exactly today", { effective_from: TODAY }),
  assignmentRow("starting tomorrow", { effective_from: TODAY + DAY_MS }),
  assignmentRow("future and closed", { effective_from: TODAY + DAY_MS, effective_to: TODAY + 10 * DAY_MS }),
  assignmentRow("another host", { host_id: "host-2" }),
  assignmentRow("another owner", { owner_id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" }),
];

const buildSql = async (options) => {
  const dataSource = new DataSource({ type: "postgres", entities: [Property_Owner_Property] });
  await dataSource.buildMetadatas();
  const queryBuilder = dataSource.getRepository(Property_Owner_Property).createQueryBuilder("assignment");
  queryBuilder.setFindOptions(options);
  return { sql: queryBuilder.getQuery(), parameters: Object.values(queryBuilder.getParameters()) };
};

beforeEach(() => {
  Database.getInstance.mockReset();
});

describe("Repository.findOwnersByHost", () => {
  test("reads only the caller's owners, ordered by last name and then first name", async () => {
    const owners = [{ id: OWNER_ID, host_id: "host-1" }];
    const { ownerRepository } = createDataSource({ owners });

    await expect(new Repository().findOwnersByHost("host-1")).resolves.toBe(owners);

    expect(ownerRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { host_id: "host-1" },
        order: { last_name: "ASC", first_name: "ASC" },
      })
    );
  });
});

describe("Repository.findOwnerByIdAndHost", () => {
  test("looks the owner up by id and the caller's host together", async () => {
    const owner = { id: OWNER_ID, host_id: "host-1" };
    const { ownerRepository } = createDataSource({ owner });

    await expect(new Repository().findOwnerByIdAndHost(OWNER_ID, "host-1")).resolves.toBe(owner);

    expect(ownerRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: OWNER_ID, host_id: "host-1" } })
    );
  });

  test("returns null when the host has no such owner", async () => {
    createDataSource({ owner: null });

    await expect(new Repository().findOwnerByIdAndHost(OWNER_ID, "host-1")).resolves.toBeNull();
  });
});

describe.each([
  ["findAssignmentsByHost", (repository) => repository.findAssignmentsByHost("host-1", TODAY)],
  [
    "findAssignmentsByOwnerAndHost",
    (repository) => repository.findAssignmentsByOwnerAndHost(OWNER_ID, "host-1", TODAY),
  ],
])("Repository.%s", (_name, read) => {
  const readOptions = async () => {
    const { assignmentRepository } = createDataSource();
    await read(new Repository());
    return assignmentRepository.find.mock.calls[0][0];
  };

  test("returns the rows the database gives back", async () => {
    const assignments = [{ owner_id: OWNER_ID, property_id: "property-1" }];
    createDataSource({ assignments });

    await expect(read(new Repository())).resolves.toBe(assignments);
  });

  test("orders the rows by effective_from and then created_at", async () => {
    const { order } = await readOptions();

    expect(order).toEqual({ effective_from: "ASC", created_at: "ASC" });
  });

  test("keeps the caller's host in every branch of the where clause", async () => {
    const { where } = await readOptions();

    expect(where.length).toBeGreaterThan(0);
    where.forEach((branch) => expect(branch.host_id).toBe("host-1"));
  });

  test("matches only rows that are current today, for the caller's host", async () => {
    const { where } = await readOptions();

    const matched = PERIOD_ROWS.filter((row) => matchesWhere(row, where)).map((row) => row.label);

    expect(matched).toEqual(
      expect.arrayContaining(["open since last month", "ending tomorrow", "starting exactly today"])
    );
    expect(matched).not.toContain("closed yesterday");
    expect(matched).not.toContain("ending exactly today");
    expect(matched).not.toContain("starting tomorrow");
    expect(matched).not.toContain("future and closed");
    expect(matched).not.toContain("another host");
  });

  test("generates SQL with the host and the period in every branch", async () => {
    const options = await readOptions();

    const { sql, parameters } = await buildSql(options);

    expect(sql.match(/"host_id" = /g)).toHaveLength(2);
    expect(sql.match(/"effective_from" <= /g)).toHaveLength(2);
    expect(sql).toMatch(/"effective_to" IS NULL/);
    expect(sql).toMatch(/"effective_to" > /);
    expect(parameters).toEqual(expect.arrayContaining(["host-1", TODAY]));
    expect(parameters).not.toContain(undefined);
  });
});

describe("Repository.findAssignmentsByOwnerAndHost", () => {
  test("matches only the requested owner", async () => {
    const { assignmentRepository } = createDataSource();
    await new Repository().findAssignmentsByOwnerAndHost(OWNER_ID, "host-1", TODAY);
    const { where } = assignmentRepository.find.mock.calls[0][0];

    const matched = PERIOD_ROWS.filter((row) => matchesWhere(row, where)).map((row) => row.label);

    expect(matched).not.toContain("another owner");
    where.forEach((branch) => expect(branch.owner_id).toBe(OWNER_ID));
  });
});

describe("Repository scope guards", () => {
  const missingValues = [undefined, null, "", 42];

  test.each(missingValues)(
    "refuses every read when the host id is %p, before touching the database",
    async (hostId) => {
      const repository = new Repository();

      await expect(repository.findOwnersByHost(hostId)).rejects.toThrow(/host id/);
      await expect(repository.findOwnerByIdAndHost(OWNER_ID, hostId)).rejects.toThrow(/host id/);
      await expect(repository.findAssignmentsByHost(hostId, TODAY)).rejects.toThrow(/host id/);
      await expect(repository.findAssignmentsByOwnerAndHost(OWNER_ID, hostId, TODAY)).rejects.toThrow(/host id/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    }
  );

  test.each(missingValues)(
    "refuses reads by owner when the owner id is %p, before touching the database",
    async (ownerId) => {
      const repository = new Repository();

      await expect(repository.findOwnerByIdAndHost(ownerId, "host-1")).rejects.toThrow(/owner id/);
      await expect(repository.findAssignmentsByOwnerAndHost(ownerId, "host-1", TODAY)).rejects.toThrow(/owner id/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    }
  );

  test.each([
    ["undefined", undefined],
    ["null", null],
    ["a string", String(TODAY)],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["negative", -DAY_MS],
    ["a fraction", TODAY + 0.5],
    ["not a UTC midnight", TODAY + 1],
  ])("refuses assignment reads when today is %s, before touching the database", async (_label, today) => {
    const repository = new Repository();

    await expect(repository.findAssignmentsByHost("host-1", today)).rejects.toThrow(/today/);
    await expect(repository.findAssignmentsByOwnerAndHost(OWNER_ID, "host-1", today)).rejects.toThrow(/today/);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });

  test("accepts the epoch itself as a UTC midnight", async () => {
    createDataSource();

    await expect(new Repository().findAssignmentsByHost("host-1", 0)).resolves.toEqual([]);
  });
});
