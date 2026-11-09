import { jest } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteRatePlan } from "database/models/DirectBookingWebsiteRatePlan";
import { Standalone_Site_Event } from "database/models/Standalone_Site_Event";

export const DB_NOW = new Date("2026-11-09T12:00:00.000Z");

export const ratePlanRow = (overrides = {}) => ({
  id: "plan-essentials",
  account_id: "host-1",
  plan: "essentials",
  price_cents: 0,
  currency: "EUR",
  billing_frequency: "monthly",
  status: "ACTIVE",
  effective_from: new Date("2026-10-01T00:00:00.000Z"),
  effective_until: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: new Date("2026-10-01T00:00:00.000Z"),
  updated_at: new Date("2026-10-01T00:00:00.000Z"),
  ...overrides,
});

export const conflictError = (shape = { code: "40001" }) =>
  Object.assign(new Error("change conflicts with another transaction, please retry: (OC000)"), shape);

export const uniqueViolation = () =>
  Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });

const INDEXED_CURRENT_STATUSES = new Set(["ACTIVE", "PAST_DUE", "TRIALING"]);
const isIndexedCurrent = (row) => INDEXED_CURRENT_STATUSES.has(row.status);
const PLAN_DEFAULTS = { currency: "EUR", billing_frequency: "monthly", status: "ACTIVE" };
const TIMESTAMP_DEFAULTS = ["effective_from", "created_at", "updated_at"];

const CONDITIONS = {
  "account_id = :accountId": (row, params) => row.account_id === params.accountId,
  "status IN (:...statuses)": (row, params) => params.statuses.includes(row.status),
  "effective_from <= CURRENT_TIMESTAMP": (row) => row.effective_from <= DB_NOW,
  "(effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP)": (row) =>
    row.effective_until === null || row.effective_until > DB_NOW,
};

const RAW_VALUES = {
  CURRENT_TIMESTAMP: () => DB_NOW,
  "CASE WHEN effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP ELSE effective_until END":
    (row) => (row.effective_until === null || row.effective_until > DB_NOW ? DB_NOW : row.effective_until),
};

const matches = (row, conditions) =>
  conditions.every(([condition, params]) => {
    const check = CONDITIONS[condition.replaceAll("plan.", "")];
    if (!check) throw new Error(`unexpected condition: ${condition}`);
    return check(row, params);
  });

const resolveValue = (row, value) => {
  if (typeof value !== "function") return value;
  const expression = value();
  if (!RAW_VALUES[expression]) throw new Error(`unexpected expression: ${expression}`);
  return RAW_VALUES[expression](row);
};

const withPlanDefaults = (values) => ({
  ...PLAN_DEFAULTS,
  ...Object.fromEntries(TIMESTAMP_DEFAULTS.map((column) => [column, DB_NOW])),
  ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)),
});

const pickReturning = (row, returning) =>
  returning === "*" ? { ...row } : Object.fromEntries(TIMESTAMP_DEFAULTS.map((column) => [column, row[column]]));

const buildManager = (transaction, options) => {
  const run = async (operation) => {
    await Promise.resolve();
    transaction.operations.push(operation);
    if (operation.entity === Standalone_Site_Event && operation.kind === "insert") {
      if (options.failEventInsert) throw options.failEventInsert;
      transaction.events.push({ ...operation.values });
      return { raw: [] };
    }
    if (operation.entity !== DirectBookingWebsiteRatePlan) throw new Error("unexpected entity");
    if (operation.kind === "read") {
      return transaction.view.filter((row) => matches(row, operation.conditions)).map((row) => ({ ...row }));
    }
    if (operation.kind === "update") {
      const rows = transaction.view.filter((row) => matches(row, operation.conditions));
      rows.forEach((row) => {
        const next = Object.fromEntries(
          Object.entries(operation.values).map(([column, value]) => [column, resolveValue(row, value)])
        );
        Object.assign(row, next);
        transaction.updatedIds.add(row.id);
      });
      return { affected: rows.length, raw: [] };
    }
    if (options.failPlanInsert) throw options.failPlanInsert;
    const row = withPlanDefaults(operation.values);
    if (transaction.view.some((other) => isIndexedCurrent(other) && other.account_id === row.account_id)) {
      throw uniqueViolation();
    }
    transaction.view.push(row);
    transaction.inserted.push(row);
    return { raw: [pickReturning(row, operation.returning)], identifiers: [{ id: row.id }] };
  };

  const builder = (entity) => {
    const operation = { entity, conditions: [] };
    const chain = {
      where: (condition, params) => operation.conditions.push([condition, params]) && chain,
      andWhere: (condition, params) => operation.conditions.push([condition, params]) && chain,
      update: (target) => Object.assign(operation, { kind: "update", entity: target }) && chain,
      set: (values) => Object.assign(operation, { values }) && chain,
      insert: () => Object.assign(operation, { kind: "insert" }) && chain,
      into: (target) => Object.assign(operation, { entity: target }) && chain,
      values: (values) => Object.assign(operation, { values }) && chain,
      returning: (returning) => Object.assign(operation, { returning }) && chain,
      getMany: () => run({ ...operation, kind: "read" }),
      execute: () => run(operation),
    };
    return chain;
  };

  return {
    getRepository: (entity) => ({
      createQueryBuilder: () => builder(entity),
      create: (values) => ({ ...values }),
      save: async (values) => (await run({ entity, kind: "insert", values, returning: "*" })).raw[0],
    }),
    createQueryBuilder: () => builder(null),
  };
};

const outsideTransaction = () =>
  jest.fn(() => {
    throw new Error("a plan write must run inside its transaction");
  });

export const buildRatePlanStore = ({ plans = [], commitFailures = [], ...options } = {}) => {
  const store = { plans: plans.map((row) => ({ ...row })), events: [], attempts: [], version: 0 };
  const rowVersions = new Map();
  let heldCommits = 0;
  let waiting = [];

  const awaitCommitTurn = () => {
    if (heldCommits === 0) return Promise.resolve();
    return new Promise((resolve) => {
      waiting.push(resolve);
      if (waiting.length === heldCommits) {
        heldCommits = 0;
        waiting.forEach((release) => release());
        waiting = [];
      }
    });
  };

  const commit = (transaction) => {
    const lostRow = [...transaction.updatedIds].some((id) => (rowVersions.get(id) ?? 0) > transaction.startVersion);
    const takenAccount = transaction.inserted.some((row) =>
      store.plans.some(
        (other) => isIndexedCurrent(other) && other.account_id === row.account_id && !transaction.updatedIds.has(other.id)
      )
    );
    if (lostRow) throw conflictError();
    if (takenAccount) throw options.commitUniqueError ?? conflictError();
    store.version += 1;
    store.plans = store.plans.map((row) =>
      transaction.updatedIds.has(row.id) ? transaction.view.find((viewRow) => viewRow.id === row.id) : row
    );
    transaction.updatedIds.forEach((id) => rowVersions.set(id, store.version));
    store.plans.push(...transaction.inserted);
    store.events.push(...transaction.events);
  };

  const client = {
    options: { schema: "main" },
    transaction: jest.fn(async (work) => {
      const transaction = {
        startVersion: store.version,
        view: store.plans.map((row) => ({ ...row })),
        updatedIds: new Set(),
        inserted: [],
        events: [],
        operations: [],
      };
      const attempt = store.attempts.length;
      store.attempts.push(transaction.operations);
      const result = await work(buildManager(transaction, options));
      await awaitCommitTurn();
      if (commitFailures[attempt]) throw commitFailures[attempt];
      commit(transaction);
      return result;
    }),
    query: outsideTransaction(),
    getRepository: outsideTransaction(),
    createQueryBuilder: outsideTransaction(),
  };

  store.holdCommitsUntil = (count) => {
    heldCommits = count;
  };
  Database.getInstance.mockResolvedValue(client);
  return store;
};
