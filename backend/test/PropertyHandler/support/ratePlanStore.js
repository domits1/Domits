import { jest } from "@jest/globals";
import { randomUUID } from "node:crypto";
import Database from "database";
import { DirectBookingWebsiteRatePlan } from "database/models/DirectBookingWebsiteRatePlan";

const CURRENT_STATUSES = new Set(["ACTIVE", "PAST_DUE", "TRIALING"]);
const isCurrentStatus = (row) => CURRENT_STATUSES.has(row.status);
const PLAN_DEFAULTS = { currency: "EUR", billing_frequency: "monthly", status: "ACTIVE", effective_until: null };

export const conflictError = () =>
  Object.assign(new Error("change conflicts with another transaction, please retry: (OC000)"), { code: "40001" });

export const uniqueViolation = () =>
  Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });

export const planRow = (overrides = {}) => ({
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

const CONDITIONS = {
  "id = :id": (row, params) => row.id === params.id,
  "account_id = :accountId": (row, params) => row.account_id === params.accountId,
  "status IN (:...statuses)": (row, params) => params.statuses.includes(row.status),
  "stripe_subscription_id = :stripeSubscriptionId": (row, params) =>
    row.stripe_subscription_id === params.stripeSubscriptionId,
  "effective_from <= CURRENT_TIMESTAMP": (row, params, now) => row.effective_from <= now,
  "(effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP)": (row, params, now) =>
    row.effective_until === null || row.effective_until > now,
};

const RAW_VALUES = {
  CURRENT_TIMESTAMP: (row, now) => now,
  "CASE WHEN effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP ELSE effective_until END":
    (row, now) => (row.effective_until === null || row.effective_until > now ? now : row.effective_until),
};

const matches = (row, conditions) =>
  conditions.every(([condition, params]) => {
    const check = CONDITIONS[condition.replaceAll("plan.", "")];
    if (!check) throw new Error(`unexpected condition: ${condition}`);
    return check(row, params, new Date());
  });

const resolveValue = (row, value) => {
  if (typeof value !== "function") return value;
  const expression = value();
  if (!RAW_VALUES[expression]) throw new Error(`unexpected expression: ${expression}`);
  return RAW_VALUES[expression](row, new Date());
};

const newRow = (values) => {
  const now = new Date();
  return {
    ...PLAN_DEFAULTS,
    effective_from: now,
    created_at: now,
    updated_at: now,
    ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)),
    id: values.id ?? randomUUID(),
  };
};

const buildContext = (rows, { onUpdate, onInsert, failInsert }) => {
  const run = async (operation) => {
    await Promise.resolve();
    if (operation.entity !== DirectBookingWebsiteRatePlan) throw new Error("unexpected entity");
    if (operation.kind === "read") {
      const found = rows.filter((row) => matches(row, operation.conditions)).map((row) => ({ ...row }));
      if (operation.orderBy) found.sort((left, right) => right.effective_from - left.effective_from);
      return found;
    }
    if (operation.kind === "update") {
      const updated = rows.filter((row) => matches(row, operation.conditions));
      updated.forEach((row) => {
        Object.entries(operation.values).forEach(([column, value]) => {
          row[column] = resolveValue(row, value);
        });
        onUpdate(row);
      });
      return { affected: updated.length, raw: [] };
    }
    if (failInsert) throw failInsert;
    const row = newRow(operation.values);
    if (isCurrentStatus(row) && rows.some((other) => isCurrentStatus(other) && other.account_id === row.account_id)) {
      throw uniqueViolation();
    }
    rows.push(row);
    onInsert(row);
    const returned = operation.returning === "*" ? { ...row } : { id: row.id };
    return { raw: [returned], identifiers: [{ id: row.id }] };
  };

  const builder = (entity) => {
    const operation = { entity, kind: "read", conditions: [] };
    const chain = {
      where: (condition, params) => Object.assign(operation, { conditions: [[condition, params]] }) && chain,
      andWhere: (condition, params) => operation.conditions.push([condition, params]) && chain,
      orderBy: (column, order) => {
        if (column !== "plan.effective_from" || order !== "DESC") throw new Error(`unexpected order: ${column} ${order}`);
        return Object.assign(operation, { orderBy: true }) && chain;
      },
      update: (target) => Object.assign(operation, { kind: "update", entity: target }) && chain,
      set: (values) => Object.assign(operation, { values }) && chain,
      insert: () => Object.assign(operation, { kind: "insert" }) && chain,
      into: (target) => Object.assign(operation, { entity: target }) && chain,
      values: (values) => Object.assign(operation, { values }) && chain,
      returning: (columns) => Object.assign(operation, { returning: columns }) && chain,
      getMany: () => run(operation),
      getOne: async () => (await run(operation))[0] ?? null,
      execute: () => run(operation),
    };
    return chain;
  };

  return {
    createQueryBuilder: () => builder(null),
    getRepository: (entity) => ({
      createQueryBuilder: () => builder(entity),
      create: (values) => ({ ...values }),
      save: async (values) => (await run({ entity, kind: "insert", values, returning: "*" })).raw[0],
      update: (criteria, values) =>
        run({ entity, kind: "update", conditions: [["id = :id", { id: criteria.id }]], values }),
      findOneBy: async ({ id }) => (await builder(entity).where("id = :id", { id }).getOne()),
    }),
  };
};

export const buildRatePlanStore = ({ plans = [], failInsert = null, commitFailures = [] } = {}) => {
  const store = { plans: plans.map((row) => ({ ...row })), transactions: [], version: 0 };
  const rowVersions = new Map();
  const bump = (row) => {
    store.version += 1;
    rowVersions.set(row.id, store.version);
  };
  let heldCommits = 0;
  let waiting = [];
  const commitTurn = () =>
    heldCommits === 0
      ? Promise.resolve()
      : new Promise((resolve) => {
          waiting.push(resolve);
          if (waiting.length < heldCommits) return;
          heldCommits = 0;
          waiting.forEach((release) => release());
          waiting = [];
        });

  const commit = (transaction) => {
    const lostRow = [...transaction.updatedIds].some((id) => (rowVersions.get(id) ?? 0) > transaction.startVersion);
    const takenAccount = transaction.inserted.some((row) =>
      store.plans.some(
        (other) => isCurrentStatus(other) && other.account_id === row.account_id && !transaction.updatedIds.has(other.id)
      )
    );
    if (lostRow || takenAccount) throw conflictError();
    store.plans.forEach((row, index) => {
      if (transaction.updatedIds.has(row.id)) {
        store.plans[index] = transaction.view.find((viewRow) => viewRow.id === row.id);
      }
    });
    store.plans.push(...transaction.inserted);
    [...transaction.updatedIds].forEach((id) => bump({ id }));
    transaction.inserted.forEach(bump);
  };

  const client = {
    ...buildContext(store.plans, { onUpdate: bump, onInsert: bump }),
    transaction: jest.fn(async (work) => {
      const beforeTransaction = store.beforeNextTransaction;
      store.beforeNextTransaction = null;
      if (beforeTransaction) beforeTransaction(store.plans);
      const attempt = store.transactions.length;
      const transaction = {
        startVersion: store.version,
        view: store.plans.map((row) => ({ ...row })),
        updatedIds: new Set(),
        inserted: [],
      };
      store.transactions.push(transaction);
      const manager = buildContext(transaction.view, {
        onUpdate: (row) => transaction.updatedIds.add(row.id),
        onInsert: (row) => transaction.inserted.push(row),
        failInsert,
      });
      const result = await work(manager);
      await commitTurn();
      if (commitFailures[attempt]) throw commitFailures[attempt];
      commit(transaction);
      return result;
    }),
  };

  store.holdCommitsUntil = (count) => {
    heldCommits = count;
  };
  Database.getInstance.mockResolvedValue(client);
  return store;
};
