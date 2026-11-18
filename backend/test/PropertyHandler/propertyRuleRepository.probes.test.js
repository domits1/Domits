import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { PropertyRuleRepository } from "../../functions/PropertyHandler/data/repository/propertyRuleRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const PROPERTY_ID = "property-1";
const STORED_RULE = { property_id: PROPERTY_ID, rule: "SmokingAllowed", value: false, value_new: null };
const missingColumn = () => Object.assign(new Error('column "value_type" does not exist'), { code: "42703" });

// A query builder that answers the rule lookups the repository makes. Asking for rules.value_type
// fails when `valueTypeFailure` is set, and a failure inside a transaction aborts it, like Postgres.
const buildClient = ({ valueTypeFailure = null, insideTransaction = false } = {}) => {
  const state = { aborted: false, failedQueries: 0, executed: [], queries: 0 };

  const buildBuilder = () => {
    const columns = [];
    let table = null;
    const builder = {
      select: (column) => (columns.push(column), builder),
      addSelect: (column) => (columns.push(column), builder),
      from: (name) => ((table = name), builder),
      where: () => builder,
      andWhere: () => builder,
      insert: () => builder,
      into: () => builder,
      values: () => builder,
      update: () => builder,
      set: () => builder,
      execute: async () => {
        state.executed.push("write");
        return { affected: 1 };
      },
      getRawMany: async () => {
        state.queries += 1;
        if (table === "rules" && columns.includes("rules.value_type") && valueTypeFailure) {
          state.failedQueries += 1;
          state.aborted = state.aborted || insideTransaction;
          throw valueTypeFailure;
        }
        if (state.aborted) throw new Error("current transaction is aborted");
        return table === "rules" ? [{ rule: "SmokingAllowed", value_type: "boolean" }] : [];
      },
      getRawOne: async () => {
        state.queries += 1;
        if (table === "rules" && columns.includes("rules.value_type") && valueTypeFailure) {
          state.failedQueries += 1;
          state.aborted = state.aborted || insideTransaction;
          throw valueTypeFailure;
        }
        if (state.aborted) throw new Error("current transaction is aborted");
        return table === "rules" ? { rule: "SmokingAllowed", value_type: "boolean" } : STORED_RULE;
      },
    };
    return builder;
  };

  return { state, createQueryBuilder: jest.fn(buildBuilder) };
};

describe("PropertyRuleRepository probes and transaction manager", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PropertyRuleRepository();
  });

  it("issues no failing value_type query inside a transaction once the probes are warm", async () => {
    Database.getInstance.mockResolvedValue(buildClient({ valueTypeFailure: missingColumn() }));
    await repository.warmProbes();

    const manager = buildClient({ valueTypeFailure: missingColumn(), insideTransaction: true });
    const saved = await repository.create({ property_id: PROPERTY_ID, rule: "SmokingAllowed", value: false }, manager);

    expect(manager.state.failedQueries).toBe(0);
    expect(manager.state.aborted).toBe(false);
    expect(manager.state.executed).toEqual(["write"]);
    expect(saved).toMatchObject({ property_id: PROPERTY_ID, rule: "SmokingAllowed" });
  });

  it("throws a transient probe failure instead of caching it as an unsupported column", async () => {
    Database.getInstance.mockResolvedValue(buildClient({ valueTypeFailure: new Error("connection reset") }));

    await expect(repository.warmProbes()).rejects.toThrow("connection reset");
    expect(repository.propertyRuleHasValueType).toBeUndefined();
  });

  it("keeps the value type when the column exists", async () => {
    Database.getInstance.mockResolvedValue(buildClient());
    await repository.warmProbes();

    expect(repository.propertyRuleHasValueType).toBe(true);
    await expect(repository.getRuleById("SmokingAllowed")).resolves.toEqual({
      rule: "SmokingAllowed",
      value_type: "boolean",
    });
  });

  it("upsertRuleByPropertyId reads and writes only through the manager it is given", async () => {
    const manager = buildClient();
    Database.getInstance.mockClear();

    const saved = await repository.upsertRuleByPropertyId(PROPERTY_ID, "SmokingAllowed", true, manager);

    expect(Database.getInstance).not.toHaveBeenCalled();
    expect(manager.state.executed).toEqual(["write"]);
    expect(saved).toMatchObject({ rule: "SmokingAllowed" });
  });
});
