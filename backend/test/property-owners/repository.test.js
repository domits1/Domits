jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const { DataSource, FindOperator } = require("typeorm");
const Database = require("database").default;
const { Property_Owner } = require("database/models/Property_Owner");
const { Property_Owner_Property } = require("database/models/Property_Owner_Property");
const { Repository } = require("../../functions/property-owners/data/repository.js");
const { Property } = require("database/models/Property");
const { ConflictException } = require("../../functions/property-owners/util/exception/conflictException.js");
const { NotFoundException } = require("../../functions/property-owners/util/exception/notFoundException.js");

const OWNER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const DAY_MS = 86400000;
const TODAY = Date.UTC(2026, 6, 1);

const createDataSource = ({ owners = [], owner = null, assignments = [], properties = [], affected = 1 } = {}) => {
  const ownerRepository = {
    find: jest.fn(async () => owners),
    findOne: jest.fn(async () => owner),
    save: jest.fn(async (record) => ({ ...record, id: OWNER_ID })),
    update: jest.fn(async () => ({ affected, raw: [], generatedMaps: [] })),
  };
  const assignmentRepository = {
    find: jest.fn(async () => assignments),
  };
  const propertyRepository = {
    find: jest.fn(async () => properties),
  };
  const repositories = new Map([
    [Property_Owner, ownerRepository],
    [Property_Owner_Property, assignmentRepository],
    [Property, propertyRepository],
  ]);
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn((entity) => repositories.get(entity)) });
  return { ownerRepository, assignmentRepository, propertyRepository };
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

describe("Repository.findPropertyTitlesByIds", () => {
  const readOptions = async (propertyIds) => {
    const { propertyRepository } = createDataSource();
    await new Repository().findPropertyTitlesByIds(propertyIds, "host-1");
    return propertyRepository.find.mock.calls[0][0];
  };

  test("returns the rows the database gives back", async () => {
    const properties = [{ id: "property-1", title: "Villa Sensual" }];
    createDataSource({ properties });

    await expect(new Repository().findPropertyTitlesByIds(["property-1"], "host-1")).resolves.toBe(properties);
  });

  test("reads only the id and title of the caller's properties, once per distinct id", async () => {
    const { propertyRepository } = createDataSource();

    await new Repository().findPropertyTitlesByIds(["property-1", "property-2", "property-1"], "host-1");

    expect(propertyRepository.find).toHaveBeenCalledTimes(1);
    const { select, where } = propertyRepository.find.mock.calls[0][0];
    expect(select).toEqual({ id: true, title: true });
    expect(Object.keys(where).sort()).toEqual(["hostid", "id"]);
    expect(where.hostid).toBe("host-1");
    expect([where.id.type, where.id.value]).toEqual(["in", ["property-1", "property-2"]]);
  });

  test("answers an empty list without touching the database", async () => {
    await expect(new Repository().findPropertyTitlesByIds([], "host-1")).resolves.toEqual([]);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });

  test("generates SQL with the ids and the caller's host", async () => {
    const options = await readOptions(["property-1", "property-2"]);
    const dataSource = new DataSource({ type: "postgres", entities: [Property] });
    await dataSource.buildMetadatas();
    const queryBuilder = dataSource.getRepository(Property).createQueryBuilder("property");
    queryBuilder.setFindOptions(options);

    const [sql, parameters] = queryBuilder.getQueryAndParameters();

    expect(sql).toMatch(/^SELECT "property"\."id" AS "property_id", "property"\."title" AS "property_title" FROM "property"/);
    expect(sql).toContain('"property"."id" IN ($1, $2)');
    expect(sql).toContain('"property"."hostid" = $3');
    expect(parameters).toEqual(["property-1", "property-2", "host-1"]);
  });

  test.each([undefined, null, "", 42])("refuses a host id %p before touching the database", async (hostId) => {
    await expect(new Repository().findPropertyTitlesByIds(["property-1"], hostId)).rejects.toThrow(/host id/);
    await expect(new Repository().findPropertyTitlesByIds([], hostId)).rejects.toThrow(/host id/);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });

  test.each([
    ["not an array", null],
    ["holding undefined", ["property-1", undefined]],
    ["holding an empty string", [""]],
    ["holding a number", [42]],
  ])("refuses property ids %s before touching the database", async (_label, propertyIds) => {
    await expect(new Repository().findPropertyTitlesByIds(propertyIds, "host-1")).rejects.toThrow(/property ids/);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });
});

describe("Repository.createOwner", () => {
  const record = Object.freeze({
    host_id: "host-1",
    first_name: "Anna",
    last_name: "de Vries",
    company_name: null,
    email: "anna@example.com",
    phone: null,
    preferred_language: null,
    owner_type: "individual",
    status: "active",
    notes: null,
    owner_user_id: null,
    created_at: 1782919800000,
    updated_at: 1782919800000,
  });

  test("saves exactly the record as one owner row", async () => {
    const { ownerRepository } = createDataSource();

    await new Repository().createOwner({ ...record });

    expect(ownerRepository.save).toHaveBeenCalledTimes(1);
    expect(ownerRepository.save).toHaveBeenCalledWith(record);
  });

  test("returns the saved row with the id the database generated", async () => {
    createDataSource();

    await expect(new Repository().createOwner({ ...record })).resolves.toEqual({ ...record, id: OWNER_ID });
  });

  test.each([undefined, null, "", 42])(
    "refuses to create an owner when the host id is %p, before touching the database",
    async (hostId) => {
      await expect(new Repository().createOwner({ ...record, host_id: hostId })).rejects.toThrow(/host id/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    }
  );
});

describe("Repository.updateOwner", () => {
  const CHANGES = Object.freeze({ first_name: "Bea", notes: null, updated_at: 1782919800000 });

  test("updates only the row with this id for the caller's host, with exactly the changes", async () => {
    const { ownerRepository } = createDataSource();

    await new Repository().updateOwner(OWNER_ID, "host-1", { ...CHANGES });

    expect(ownerRepository.update).toHaveBeenCalledTimes(1);
    expect(ownerRepository.update).toHaveBeenCalledWith({ id: OWNER_ID, host_id: "host-1" }, CHANGES);
  });

  test.each([1, 0])("returns the affected row count %i", async (affected) => {
    createDataSource({ affected });

    await expect(new Repository().updateOwner(OWNER_ID, "host-1", { ...CHANGES })).resolves.toBe(affected);
  });

  test("reruns the update once after a DSQL conflict and then returns its count", async () => {
    const { ownerRepository } = createDataSource();
    ownerRepository.update.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "40001" }));

    await expect(new Repository().updateOwner(OWNER_ID, "host-1", { ...CHANGES })).resolves.toBe(1);
    expect(ownerRepository.update).toHaveBeenCalledTimes(2);
  });

  test("passes any other database error on unchanged", async () => {
    const { ownerRepository } = createDataSource();
    const error = new Error("connection reset");
    ownerRepository.update.mockRejectedValue(error);

    await expect(new Repository().updateOwner(OWNER_ID, "host-1", { ...CHANGES })).rejects.toBe(error);
    expect(ownerRepository.update).toHaveBeenCalledTimes(1);
  });

  test("generates SQL with both the id and the caller's host in the WHERE", async () => {
    const { ownerRepository } = createDataSource();
    await new Repository().updateOwner(OWNER_ID, "host-1", { ...CHANGES });
    const [criteria, values] = ownerRepository.update.mock.calls[0];
    const dataSource = new DataSource({ type: "postgres", entities: [Property_Owner] });
    await dataSource.buildMetadatas();

    const [sql, parameters] = dataSource
      .createQueryBuilder()
      .update(Property_Owner)
      .set(values)
      .where(criteria)
      .getQueryAndParameters();

    expect(sql).toMatch(/^UPDATE "property_owner" SET "first_name" = \$1, "notes" = \$2, "updated_at" = \$3 WHERE/);
    expect(sql).toContain('"id" = $4');
    expect(sql).toContain('"host_id" = $5');
    expect(parameters).toEqual(["Bea", null, 1782919800000, OWNER_ID, "host-1"]);
  });

  describe("guards", () => {
    test.each([undefined, null, "", 42])("refuses an owner id %p before touching the database", async (ownerId) => {
      await expect(new Repository().updateOwner(ownerId, "host-1", { ...CHANGES })).rejects.toThrow(/owner id/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    });

    test.each([undefined, null, "", 42])("refuses a host id %p before touching the database", async (hostId) => {
      await expect(new Repository().updateOwner(OWNER_ID, hostId, { ...CHANGES })).rejects.toThrow(/host id/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    });

    test.each([
      ["undefined", undefined],
      ["null", null],
      ["an array", [["first_name", "Bea"]]],
      ["a string", "first_name"],
      ["an empty object", {}],
      ["a change to id", { ...CHANGES, id: OWNER_ID }],
      ["a change to host_id", { ...CHANGES, host_id: "host-2" }],
      ["a change to owner_user_id", { ...CHANGES, owner_user_id: "user-2" }],
      ["a change to created_at", { ...CHANGES, created_at: 1 }],
    ])("refuses changes that are %s before touching the database", async (_label, changes) => {
      await expect(new Repository().updateOwner(OWNER_ID, "host-1", changes)).rejects.toThrow(/changes/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    });
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

describe("Repository.replacePropertyShares", () => {
  const OWNER_B = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
  const EFFECTIVE_FROM = TODAY + 10 * DAY_MS;
  const NOW = TODAY + 15 * 3600000;
  const PROPERTY = Object.freeze({ id: "property-1", title: "Villa Sensual" });
  const OWNERS = Object.freeze([
    { id: OWNER_ID, status: "active" },
    { id: OWNER_B, status: "active" },
  ]);
  const CONFLICT_MESSAGE = "The ownership of this property changed at the same time. Reload and try again.";
  const SCOPE = Object.freeze({ property_id: "property-1", host_id: "host-1" });

  const newRow = (ownerId, ownershipBasisPoints) => ({
    owner_id: ownerId,
    property_id: "property-1",
    host_id: "host-1",
    ownership_basis_points: ownershipBasisPoints,
    effective_from: EFFECTIVE_FROM,
    effective_to: null,
    created_at: NOW,
    updated_at: NOW,
  });

  const shareArgs = (overrides = {}) => ({
    hostId: "host-1",
    propertyId: "property-1",
    effectiveFrom: EFFECTIVE_FROM,
    today: TODAY,
    now: NOW,
    ownerIds: [OWNER_ID, OWNER_B],
    rows: [newRow(OWNER_ID, 6000), newRow(OWNER_B, 4000)],
    assertWritable: jest.fn(),
    ...overrides,
  });

  const createTransactionalDataSource = ({ property = PROPERTY, owners = OWNERS, savedRows = [], failures = [] } = {}) => {
    const calls = [];
    const recorder = (name, result) =>
      jest.fn(async (...args) => {
        calls.push(name);
        return result;
      });
    const propertyRepository = { findOne: recorder("lock property", property) };
    const ownerRepository = { find: recorder("lock owners", owners) };
    const shareRepository = {
      delete: recorder("delete", { affected: 0 }),
      update: recorder("close", { affected: 0 }),
      insert: recorder("insert", {}),
      find: recorder("read", savedRows),
    };
    const repositories = new Map([
      [Property, propertyRepository],
      [Property_Owner, ownerRepository],
      [Property_Owner_Property, shareRepository],
    ]);
    const manager = { getRepository: jest.fn((entity) => repositories.get(entity)) };
    const pendingFailures = [...failures];
    const transaction = jest.fn(async (work) => {
      calls.push("begin");
      const result = await work(manager);
      const failure = pendingFailures.shift();
      if (failure) throw failure;
      return result;
    });
    Database.getInstance.mockResolvedValue({ transaction });
    return { calls, transaction, propertyRepository, ownerRepository, shareRepository };
  };

  const recordingAssert = (calls, implementation = () => {}) =>
    jest.fn((facts) => {
      calls.push("assertWritable");
      return implementation(facts);
    });

  const buildWriteSql = async (build) => {
    const dataSource = new DataSource({ type: "postgres", entities: [Property_Owner_Property] });
    await dataSource.buildMetadatas();
    const [sql, parameters] = build(dataSource.createQueryBuilder()).getQueryAndParameters();
    return { sql, parameters };
  };

  const operator = (condition) => [condition.type, condition.value];

  test("locks, checks, deletes, closes twice, inserts and reads, in that order", async () => {
    const dataSource = createTransactionalDataSource();
    const assertWritable = recordingAssert(dataSource.calls);

    await new Repository().replacePropertyShares(shareArgs({ assertWritable }));

    expect(dataSource.calls).toEqual([
      "begin",
      "lock property",
      "lock owners",
      "assertWritable",
      "delete",
      "close",
      "close",
      "insert",
      "read",
    ]);
  });

  test("locks the caller's property and the requested owners for writing", async () => {
    const { propertyRepository, ownerRepository } = createTransactionalDataSource();

    await new Repository().replacePropertyShares(shareArgs());

    expect(propertyRepository.findOne).toHaveBeenCalledWith({
      select: { id: true, title: true },
      where: { id: "property-1", hostid: "host-1" },
      lock: { mode: "pessimistic_write" },
    });
    const ownerOptions = ownerRepository.find.mock.calls[0][0];
    expect(ownerOptions.select).toEqual({ id: true, status: true });
    expect(ownerOptions.lock).toEqual({ mode: "pessimistic_write" });
    expect(ownerOptions.where.host_id).toBe("host-1");
    expect(operator(ownerOptions.where.id)).toEqual(["in", [OWNER_ID, OWNER_B]]);
  });

  test("hands the locked property and owners to assertWritable", async () => {
    createTransactionalDataSource();
    const assertWritable = jest.fn();

    await new Repository().replacePropertyShares(shareArgs({ assertWritable }));

    expect(assertWritable).toHaveBeenCalledWith({ property: PROPERTY, owners: OWNERS });
  });

  test("deletes every row of the property that starts on or after effective_from", async () => {
    const { shareRepository } = createTransactionalDataSource();

    await new Repository().replacePropertyShares(shareArgs());

    const [criteria] = shareRepository.delete.mock.calls[0];
    expect(Object.keys(criteria).sort()).toEqual(["effective_from", "host_id", "property_id"]);
    expect(criteria).toMatchObject(SCOPE);
    expect(operator(criteria.effective_from)).toEqual(["moreThanOrEqual", EFFECTIVE_FROM]);
  });

  test("closes the open rows and the rows that run past effective_from, both at effective_from", async () => {
    const { shareRepository } = createTransactionalDataSource();

    await new Repository().replacePropertyShares(shareArgs());

    const [[openCriteria, openValues], [overlapCriteria, overlapValues]] = shareRepository.update.mock.calls;
    [openCriteria, overlapCriteria].forEach((criteria) => {
      expect(Object.keys(criteria).sort()).toEqual(["effective_from", "effective_to", "host_id", "property_id"]);
      expect(criteria).toMatchObject(SCOPE);
      expect(operator(criteria.effective_from)).toEqual(["lessThan", EFFECTIVE_FROM]);
    });
    expect(openCriteria.effective_to.type).toBe("isNull");
    expect(operator(overlapCriteria.effective_to)).toEqual(["moreThan", EFFECTIVE_FROM]);
    expect(openValues).toEqual({ effective_to: EFFECTIVE_FROM, updated_at: NOW });
    expect(overlapValues).toEqual({ effective_to: EFFECTIVE_FROM, updated_at: NOW });
  });

  test("inserts exactly the new rows, as copies, so a retry never reuses an id from a rolled back attempt", async () => {
    const { shareRepository } = createTransactionalDataSource();
    const args = shareArgs();

    await new Repository().replacePropertyShares(args);

    const [inserted] = shareRepository.insert.mock.calls[0];
    expect(inserted).toEqual(args.rows);
    inserted.forEach((row, index) => expect(row).not.toBe(args.rows[index]));
  });

  test("reads the current and upcoming rows of the property and returns them with the locked property", async () => {
    const savedRows = [newRow(OWNER_ID, 6000)];
    const { shareRepository } = createTransactionalDataSource({ savedRows });

    await expect(new Repository().replacePropertyShares(shareArgs())).resolves.toEqual({
      property: PROPERTY,
      rows: savedRows,
    });

    const [options] = shareRepository.find.mock.calls[0];
    expect(options.order).toEqual({ effective_from: "ASC", created_at: "ASC" });
    expect(options.where).toHaveLength(2);
    options.where.forEach((branch) => expect(branch).toMatchObject(SCOPE));
    expect(options.where[0].effective_to.type).toBe("isNull");
    expect(operator(options.where[1].effective_to)).toEqual(["moreThan", TODAY]);
  });

  test("makes no write when assertWritable throws, and passes its error on", async () => {
    const { shareRepository, transaction } = createTransactionalDataSource({ property: null });
    const assertWritable = jest.fn(() => {
      throw new NotFoundException("Property not found.");
    });

    await expect(new Repository().replacePropertyShares(shareArgs({ assertWritable }))).rejects.toMatchObject({
      statusCode: 404,
      message: "Property not found.",
    });
    expect(shareRepository.delete).not.toHaveBeenCalled();
    expect(shareRepository.update).not.toHaveBeenCalled();
    expect(shareRepository.insert).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  test("closes and deletes but inserts nothing for an empty list, and skips the owner query", async () => {
    const dataSource = createTransactionalDataSource({ owners: [] });
    const assertWritable = recordingAssert(dataSource.calls);

    await new Repository().replacePropertyShares(shareArgs({ ownerIds: [], rows: [], assertWritable }));

    expect(dataSource.calls).toEqual(["begin", "lock property", "assertWritable", "delete", "close", "close", "read"]);
    expect(assertWritable).toHaveBeenCalledWith({ property: PROPERTY, owners: [] });
  });

  test("reruns the whole transaction after a DSQL conflict", async () => {
    const dataSource = createTransactionalDataSource({ failures: [Object.assign(new Error("conflict"), { code: "40001" })] });

    await new Repository().replacePropertyShares(shareArgs());

    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    expect(dataSource.calls.filter((call) => call === "lock property")).toHaveLength(2);
    expect(dataSource.calls.filter((call) => call === "insert")).toHaveLength(2);
  });

  test("answers 409 when the conflict outlasts the retries", async () => {
    const conflict = () => Object.assign(new Error("conflict"), { code: "40001" });
    const dataSource = createTransactionalDataSource({ failures: [conflict(), conflict(), conflict()] });

    const failure = new Repository().replacePropertyShares(shareArgs());

    await expect(failure).rejects.toBeInstanceOf(ConflictException);
    await expect(failure).rejects.toMatchObject({ statusCode: 409, message: CONFLICT_MESSAGE });
    expect(dataSource.transaction).toHaveBeenCalledTimes(3);
  });

  test.each([
    ["on the error", Object.assign(new Error("duplicate key"), { code: "23505" })],
    ["on the driver error", Object.assign(new Error("duplicate key"), { driverError: { code: "23505" } })],
  ])("answers 409 without a retry for a unique violation reported %s", async (_label, error) => {
    const dataSource = createTransactionalDataSource({ failures: [error] });

    await expect(new Repository().replacePropertyShares(shareArgs())).rejects.toMatchObject({
      statusCode: 409,
      message: CONFLICT_MESSAGE,
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  test("passes any other database error on unchanged", async () => {
    const error = new Error("connection reset");
    createTransactionalDataSource({ failures: [error] });

    await expect(new Repository().replacePropertyShares(shareArgs())).rejects.toBe(error);
  });

  test("generates SQL for the delete with the property, the host and effective_from", async () => {
    const { shareRepository } = createTransactionalDataSource();
    await new Repository().replacePropertyShares(shareArgs());
    const [criteria] = shareRepository.delete.mock.calls[0];

    const { sql, parameters } = await buildWriteSql((builder) =>
      builder.delete().from(Property_Owner_Property).where(criteria)
    );

    expect(sql).toMatch(/^DELETE FROM "property_owner_property" WHERE/);
    expect(sql).toContain('"property_id" = $1');
    expect(sql).toContain('"host_id" = $2');
    expect(sql).toContain('"effective_from" >= $3');
    expect(parameters).toEqual(["property-1", "host-1", EFFECTIVE_FROM]);
  });

  test("generates SQL for both closes with the property, the host and the period", async () => {
    const { shareRepository } = createTransactionalDataSource();
    await new Repository().replacePropertyShares(shareArgs());
    const [[openCriteria, values], [overlapCriteria]] = shareRepository.update.mock.calls;

    const open = await buildWriteSql((builder) =>
      builder.update(Property_Owner_Property).set(values).where(openCriteria)
    );
    const overlap = await buildWriteSql((builder) =>
      builder.update(Property_Owner_Property).set(values).where(overlapCriteria)
    );

    [open, overlap].forEach(({ sql }) => {
      expect(sql).toMatch(/^UPDATE "property_owner_property" SET "effective_to" = \$1, "updated_at" = \$2 WHERE/);
      expect(sql).toContain('"property_id" = $3');
      expect(sql).toContain('"host_id" = $4');
      expect(sql).toContain('"effective_from" < $5');
    });
    expect(open.sql).toContain('"effective_to" IS NULL');
    expect(overlap.sql).toContain('"effective_to" > $6');
    expect(open.parameters).toEqual([EFFECTIVE_FROM, NOW, "property-1", "host-1", EFFECTIVE_FROM]);
    expect(overlap.parameters).toEqual([EFFECTIVE_FROM, NOW, "property-1", "host-1", EFFECTIVE_FROM, EFFECTIVE_FROM]);
  });

  test("generates SQL for the read with the property and the host in both branches", async () => {
    const { shareRepository } = createTransactionalDataSource();
    await new Repository().replacePropertyShares(shareArgs());
    const [options] = shareRepository.find.mock.calls[0];

    const { sql, parameters } = await buildWriteSql((builder) =>
      builder.select("assignment").from(Property_Owner_Property, "assignment").setFindOptions(options)
    );

    const where = sql.slice(sql.indexOf("WHERE"));
    expect(where.match(/"assignment"\."property_id" = \$\d+/g)).toHaveLength(2);
    expect(where.match(/"assignment"\."host_id" = \$\d+/g)).toHaveLength(2);
    expect(where).toContain('"assignment"."effective_to" IS NULL');
    expect(where).toMatch(/"assignment"\."effective_to" > \$\d+/);
    expect(parameters).toEqual(["property-1", "host-1", "property-1", "host-1", TODAY]);
  });

  describe("guards", () => {
    test.each([undefined, null, "", 42])("refuses a host id %p before touching the database", async (hostId) => {
      await expect(new Repository().replacePropertyShares(shareArgs({ hostId }))).rejects.toThrow(/host id/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    });

    test.each([undefined, null, "", 42])("refuses a property id %p before touching the database", async (propertyId) => {
      await expect(new Repository().replacePropertyShares(shareArgs({ propertyId }))).rejects.toThrow(/property id/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    });

    test.each([
      ["undefined", undefined],
      ["a string", String(EFFECTIVE_FROM)],
      ["not a UTC midnight", EFFECTIVE_FROM + 1],
      ["negative", -DAY_MS],
    ])("refuses an effectiveFrom that is %s before touching the database", async (_label, effectiveFrom) => {
      await expect(new Repository().replacePropertyShares(shareArgs({ effectiveFrom }))).rejects.toThrow(/effectiveFrom/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    });

    test.each([
      ["undefined", undefined],
      ["not a UTC midnight", TODAY + 1],
    ])("refuses a today that is %s before touching the database", async (_label, today) => {
      await expect(new Repository().replacePropertyShares(shareArgs({ today }))).rejects.toThrow(/today/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    });

    test.each([
      ["rows that are not an array", { rows: null }],
      ["owner ids that are not an array", { ownerIds: null }],
      ["a row for another host", { rows: [{ ...newRow(OWNER_ID, 10000), host_id: "host-2" }] }],
      ["a row for another property", { rows: [{ ...newRow(OWNER_ID, 10000), property_id: "property-2" }] }],
      ["a row without a host", { rows: [{ ...newRow(OWNER_ID, 10000), host_id: undefined }] }],
    ])("refuses %s before touching the database", async (_label, overrides) => {
      await expect(new Repository().replacePropertyShares(shareArgs(overrides))).rejects.toThrow(/rows|owner ids/);
      expect(Database.getInstance).not.toHaveBeenCalled();
    });
  });
});
