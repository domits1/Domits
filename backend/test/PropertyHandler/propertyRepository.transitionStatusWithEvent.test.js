import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import { Property } from "database/models/Property";
import { Property_Moderation_Event } from "database/models/Property_Moderation_Event";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const NOW = 1_800_000_000_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const conflict = (code = "40001") => Object.assign(new Error("change conflicts with another transaction"), { code });

const buildHarness = ({
  row,
  archiveColumns = [],
  commitFailures = [],
  insertError,
  updateMatchesNothing = false,
  beforeAttempt,
} = {}) => {
  const state = { row: row ? { ...row } : null };
  const committed = [];
  const executedInserts = [];
  const managers = [];
  const reads = [];

  const buildManager = (pending) => ({
    query: jest.fn(async (statement, params) => {
      if (statement.includes("information_schema")) {
        return archiveColumns.map((column) => ({ column_name: column }));
      }
      pending.push({ kind: "sql", statement, params });
      return [];
    }),
    createQueryBuilder: jest.fn((entity, alias) => {
      const operation = {};
      const chain = {
        select: (columns) => Object.assign(operation, { kind: "select", entity, alias, columns }) && chain,
        getOne: async () => {
          reads.push({ ...operation });
          return state.row ? { status: state.row.status, updatedat: String(state.row.updatedat) } : null;
        },
        update: (entity) => Object.assign(operation, { kind: "update", entity }) && chain,
        insert: () => Object.assign(operation, { kind: "insert" }) && chain,
        into: (entity) => Object.assign(operation, { entity }) && chain,
        set: (values) => Object.assign(operation, { values }) && chain,
        values: (values) => Object.assign(operation, { values }) && chain,
        where: (condition, params) => Object.assign(operation, { condition, params }) && chain,
        execute: async () => {
          if (operation.kind === "insert") {
            executedInserts.push(operation.values);
            if (insertError) {
              throw insertError;
            }
            pending.push({ ...operation });
            return { identifiers: [] };
          }
          pending.push({ ...operation });
          const matches =
            !updateMatchesNothing &&
            state.row &&
            state.row.status === operation.params.fromStatus &&
            state.row.updatedat === operation.params.currentUpdatedAt;
          return { affected: matches ? 1 : 0 };
        },
      };
      return chain;
    }),
  });

  let attemptIndex = 0;
  const client = {
    query: jest.fn(() => {
      throw new Error("client.query used outside the transaction");
    }),
    createQueryBuilder: jest.fn(() => {
      throw new Error("client.createQueryBuilder used outside the transaction");
    }),
    transaction: jest.fn(async (callback) => {
      const pending = [];
      const manager = buildManager(pending);
      managers.push(manager);
      beforeAttempt?.(attemptIndex, state);
      const result = await callback(manager);
      const failure = commitFailures[attemptIndex];
      attemptIndex += 1;
      if (failure) {
        throw failure;
      }
      committed.push(...pending);
      return result;
    }),
  };
  Database.getInstance.mockResolvedValue(client);
  return { client, state, committed, executedInserts, managers, reads };
};

const ROW = { status: "PENDING_REVIEW", updatedat: 1_700_000_000_000 };
const reviewArguments = (overrides = {}) => ({
  fromStatuses: ["PENDING_REVIEW"],
  toStatus: "ACTIVE",
  action: "APPROVED",
  actorId: "admin-1",
  ...overrides,
});
const insertsOf = (committed) => committed.filter((operation) => operation.kind === "insert");
const updatesOf = (committed) => committed.filter((operation) => operation.kind === "update");

describe("PropertyRepository.transitionStatusWithEvent", () => {
  let repository;

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    repository = new PropertyRepository({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Database.getInstance.mockReset();
  });

  describe("a change that applies", () => {
    it("updates the status and writes one event, both through the same manager", async () => {
      const { committed, managers } = buildHarness({ row: ROW });

      const outcome = await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(outcome).toEqual({ outcome: "changed", fromStatus: "PENDING_REVIEW", updatedAt: NOW });
      expect(managers).toHaveLength(1);
      expect(managers[0].createQueryBuilder).toHaveBeenCalledTimes(3);
      expect(updatesOf(committed)).toHaveLength(1);
      expect(insertsOf(committed)).toHaveLength(1);
      expect(updatesOf(committed)[0]).toMatchObject({
        entity: Property,
        values: { status: "ACTIVE", updatedat: NOW },
        condition: "id = :id AND status = :fromStatus AND updatedat = :currentUpdatedAt",
        params: { id: "property-1", fromStatus: "PENDING_REVIEW", currentUpdatedAt: ROW.updatedat },
      });
    });

    it("reads the current row through the Property entity, not through raw SQL", async () => {
      const { managers, reads } = buildHarness({ row: ROW });

      await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(reads).toHaveLength(1);
      expect(reads[0]).toMatchObject({
        entity: Property,
        columns: expect.arrayContaining([expect.stringMatching(/.status$/), expect.stringMatching(/.updatedat$/)]),
        condition: expect.stringMatching(/.id = :id$/),
        params: { id: "property-1" },
      });
      expect(managers[0].query).not.toHaveBeenCalledWith(expect.stringMatching(/SELECT/i), expect.anything());
    });

    it("records the event with the actor, the action and both statuses", async () => {
      const { committed } = buildHarness({ row: ROW });

      await repository.transitionStatusWithEvent(
        "property-1",
        reviewArguments({ toStatus: "REJECTED", action: "REJECTED", reason: "Photos are blurry." })
      );

      const [insert] = insertsOf(committed);
      expect(insert.entity).toBe(Property_Moderation_Event);
      expect(insert.values).toEqual({
        id: expect.stringMatching(UUID_PATTERN),
        propertyId: "property-1",
        action: "REJECTED",
        actorId: "admin-1",
        reason: "Photos are blurry.",
        fromStatus: "PENDING_REVIEW",
        toStatus: "REJECTED",
        createdAt: NOW,
      });
    });

    it("stores a null reason when none is given", async () => {
      const { committed } = buildHarness({ row: ROW });

      await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(insertsOf(committed)[0].values.reason).toBeNull();
    });

    it.each(["INACTIVE", "REJECTED", "ARCHIVED"])(
      "writes the status it actually read as from_status when the row is %s",
      async (currentStatus) => {
        const { committed } = buildHarness({ row: { status: currentStatus, updatedat: 5 } });

        const outcome = await repository.transitionStatusWithEvent("property-1", {
          fromStatuses: ["INACTIVE", "REJECTED", "ARCHIVED"],
          toStatus: "PENDING_REVIEW",
          action: "SUBMITTED",
          actorId: "host-1",
        });

        expect(outcome.fromStatus).toBe(currentStatus);
        expect(insertsOf(committed)[0].values).toMatchObject({
          action: "SUBMITTED",
          fromStatus: currentStatus,
          toStatus: "PENDING_REVIEW",
        });
        expect(updatesOf(committed)[0].params.fromStatus).toBe(currentStatus);
      }
    );

    it("applies when expectedUpdatedAt matches the row", async () => {
      const { committed } = buildHarness({ row: ROW });

      const outcome = await repository.transitionStatusWithEvent(
        "property-1",
        reviewArguments({ expectedUpdatedAt: ROW.updatedat })
      );

      expect(outcome.outcome).toBe("changed");
      expect(insertsOf(committed)).toHaveLength(1);
    });
  });

  describe("a change that does not apply", () => {
    it("reports not_found and writes nothing when the property does not exist", async () => {
      const { committed } = buildHarness({ row: null });

      const outcome = await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(outcome).toEqual({ outcome: "not_found" });
      expect(committed).toEqual([]);
    });

    it("reports wrong_status with the current status and writes nothing", async () => {
      const { committed } = buildHarness({ row: { status: "ACTIVE", updatedat: 9 } });

      const outcome = await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(outcome).toEqual({ outcome: "wrong_status", currentStatus: "ACTIVE" });
      expect(committed).toEqual([]);
    });

    it("reports stale with the current updatedAt and writes nothing when expectedUpdatedAt differs", async () => {
      const { committed } = buildHarness({ row: ROW });

      const outcome = await repository.transitionStatusWithEvent(
        "property-1",
        reviewArguments({ expectedUpdatedAt: ROW.updatedat - 1 })
      );

      expect(outcome).toEqual({ outcome: "stale", currentUpdatedAt: ROW.updatedat });
      expect(committed).toEqual([]);
    });

    it("writes no event when the conditional update matches no row", async () => {
      const { executedInserts } = buildHarness({ row: ROW, updateMatchesNothing: true });

      const outcome = await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(outcome.outcome).toBe("stale");
      expect(executedInserts).toEqual([]);
    });
  });

  describe("write conflicts", () => {
    it.each(["40001", "OC001"])("retries the whole transaction after %s and applies the change once", async (code) => {
      const { client, committed } = buildHarness({ row: ROW, commitFailures: [conflict(code)] });

      const outcome = await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(outcome.outcome).toBe("changed");
      expect(client.transaction).toHaveBeenCalledTimes(2);
      expect(updatesOf(committed)).toHaveLength(1);
      expect(insertsOf(committed)).toHaveLength(1);
    });

    it("reuses the same event id and timestamp on every attempt", async () => {
      const { executedInserts } = buildHarness({ row: ROW, commitFailures: [conflict(), conflict()] });
      let tick = NOW;
      Date.now.mockImplementation(() => (tick += 1000));

      await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(executedInserts).toHaveLength(3);
      expect(new Set(executedInserts.map((values) => values.id)).size).toBe(1);
      expect(new Set(executedInserts.map((values) => values.createdAt)).size).toBe(1);
    });

    it("re-reads the row on the retry and reports what it finds", async () => {
      const { committed, client } = buildHarness({
        row: ROW,
        commitFailures: [conflict()],
        beforeAttempt: (attempt, state) => {
          if (attempt === 1) {
            state.row = { status: "ACTIVE", updatedat: 77 };
          }
        },
      });

      const outcome = await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(outcome).toEqual({ outcome: "wrong_status", currentStatus: "ACTIVE" });
      expect(client.transaction).toHaveBeenCalledTimes(2);
      expect(committed).toEqual([]);
    });

    it.each(["40001", "OC001"])("rethrows %s once the attempts are used up and commits nothing", async (code) => {
      const { client, committed } = buildHarness({
        row: ROW,
        commitFailures: [conflict(code), conflict(code), conflict(code)],
      });

      await expect(repository.transitionStatusWithEvent("property-1", reviewArguments())).rejects.toMatchObject({
        code,
      });

      expect(client.transaction).toHaveBeenCalledTimes(3);
      expect(committed).toEqual([]);
    });

    it("does not retry an error that is not a conflict", async () => {
      const failure = Object.assign(new Error("connection reset"), { code: "08006" });
      const { client } = buildHarness({ row: ROW, commitFailures: [failure] });

      await expect(repository.transitionStatusWithEvent("property-1", reviewArguments())).rejects.toBe(failure);

      expect(client.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("atomicity", () => {
    it("leaves no status change behind when the event insert fails", async () => {
      const insertError = new Error("insert failed");
      const { committed } = buildHarness({ row: ROW, insertError });

      await expect(repository.transitionStatusWithEvent("property-1", reviewArguments())).rejects.toBe(insertError);

      expect(committed).toEqual([]);
    });

    it("runs everything through the manager and never through the client", async () => {
      const { client, managers } = buildHarness({ row: ROW });

      await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(Database.getInstance).toHaveBeenCalledTimes(1);
      expect(client.query).not.toHaveBeenCalled();
      expect(client.createQueryBuilder).not.toHaveBeenCalled();
      expect(managers[0].createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe("archive metadata", () => {
    const leaveArchive = {
      fromStatuses: ["ARCHIVED"],
      toStatus: "PENDING_REVIEW",
      action: "SUBMITTED",
      actorId: "host-1",
    };

    it("clears it on the manager when the property leaves ARCHIVED", async () => {
      const { committed, managers, client } = buildHarness({
        row: { status: "ARCHIVED", updatedat: 5 },
        archiveColumns: ["archivedat", "archivedby", "archivereason"],
      });

      await repository.transitionStatusWithEvent("property-1", leaveArchive);

      const clearing = committed.filter((operation) => operation.kind === "sql");
      expect(clearing).toHaveLength(1);
      expect(clearing[0].statement).toBe(
        "UPDATE property SET archivedat = NULL, archivedby = NULL, archivereason = NULL WHERE id = $1"
      );
      expect(clearing[0].params).toEqual(["property-1"]);
      expect(managers[0].query).toHaveBeenCalledWith(expect.stringContaining("information_schema"));
      expect(client.query).not.toHaveBeenCalled();
    });

    it("does not touch it when the property does not leave ARCHIVED", async () => {
      const { committed, managers } = buildHarness({
        row: ROW,
        archiveColumns: ["archivedat", "archivedby", "archivereason"],
      });

      await repository.transitionStatusWithEvent("property-1", reviewArguments());

      expect(committed.filter((operation) => operation.kind === "sql")).toEqual([]);
      expect(managers[0].query).not.toHaveBeenCalledWith(expect.stringContaining("information_schema"));
    });

    it("does not clear it when the change did not apply", async () => {
      const { committed } = buildHarness({
        row: { status: "ACTIVE", updatedat: 5 },
        archiveColumns: ["archivedat"],
      });

      await repository.transitionStatusWithEvent("property-1", leaveArchive);

      expect(committed).toEqual([]);
    });
  });

  describe("arguments", () => {
    it("throws before opening a transaction when fromStatuses is empty", async () => {
      const { client } = buildHarness({ row: ROW });

      await expect(
        repository.transitionStatusWithEvent("property-1", reviewArguments({ fromStatuses: [] }))
      ).rejects.toThrow(TypeError);

      expect(client.transaction).not.toHaveBeenCalled();
    });

    it.each(["APPROVE", "", undefined, "ARCHIVED"])(
      "throws before opening a transaction for action %p",
      async (action) => {
        const { client } = buildHarness({ row: ROW });

        await expect(
          repository.transitionStatusWithEvent("property-1", reviewArguments({ action }))
        ).rejects.toThrow(TypeError);

        expect(client.transaction).not.toHaveBeenCalled();
      }
    );

    it("throws before opening a transaction when there is no actor", async () => {
      const { client } = buildHarness({ row: ROW });

      await expect(
        repository.transitionStatusWithEvent("property-1", reviewArguments({ actorId: "" }))
      ).rejects.toThrow(TypeError);

      expect(client.transaction).not.toHaveBeenCalled();
    });
  });
});
