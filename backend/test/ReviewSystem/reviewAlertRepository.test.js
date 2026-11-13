jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import { DataSource, InsertQueryBuilder, UpdateQueryBuilder } from "typeorm";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Review_Alert } from "../../ORM/models/Review_Alert.js";
import { Tables } from "../../ORM/util/database/Tables.js";
import { CreateReviewAlert20261113 } from "../../ORM/migrations/20261113_create_review_alert.js";
import { ReviewAlertRepository } from "../../functions/ReviewSystem/data/reviewAlertRepository.js";

const alert = { recipient_user_id: "host", property_id: "property", review_id: "review",
  alert_type: "NEW_REVIEW", event_key: "publication-1" };
// Execute actual TypeORM PostgreSQL SQL against SQLite for portable storage tests.
// Only positional bind syntax is adapted; a live PostgreSQL migration is not run here.
const driver = `const { DatabaseSync } = require('node:sqlite');
  const [file, sql, values, mode] = JSON.parse(process.argv[1]);
  const db = new DatabaseSync(file, { timeout: 5000 });
  db.function('GREATEST', (a, b) => Math.max(a, b));
  const result = mode === 'ddl' ? db.exec(sql) : mode === 'rows'
    ? db.prepare(sql.replace(/\\$\\d+/g, '?')).all(...values)
    : db.prepare(sql.replace(/\\$\\d+/g, '?')).run(...values);
  console.log(JSON.stringify(result ?? null)); db.close();`;

describe("ReviewAlertRepository storage", () => {
  let directory, file, source, repository, rules, queries, ddl;
  const run = (sql, parameters = [], mode = "rows") => JSON.parse(execFileSync(process.execPath,
    ["-e", driver, JSON.stringify([file, sql, parameters, mode])], { encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } }));
  beforeAll(async () => {
    source = new DataSource({ type: "postgres", entities: [Review_Alert] });
    await source.buildMetadatas();
    ddl = [];
    await new CreateReviewAlert20261113().up({ query: async (sql) => ddl.push(sql) });
  });
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "review-alert-")); file = join(directory, "alerts.sqlite");
    run(ddl.find((sql) => sql.startsWith("CREATE TABLE IF NOT EXISTS main.")), [], "ddl");
    queries = [];
    repository = source.getRepository(Review_Alert);
    const original = repository.createQueryBuilder.bind(repository);
    for (const builder of [InsertQueryBuilder, UpdateQueryBuilder]) {
      jest.spyOn(builder.prototype, "execute").mockImplementation(async function () {
        const [sql, parameters] = this.getQueryAndParameters(); queries.push([sql, parameters]);
        if (sql.includes("RETURNING")) return { raw: run(sql, parameters) };
        return { affected: run(sql, parameters, "run").changes };
      });
    }
    jest.spyOn(repository, "find").mockImplementation(async (options) => {
      const [sql, parameters] = original("alert").setFindOptions(options).getQueryAndParameters();
      queries.push([sql, parameters]);
      const rows = run(sql, parameters);
      return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/^alert_/, ""), value])));
    });
    rules = new ReviewAlertRepository({ getDatabase: async () => source, now: () => 1000 });
  });
  afterEach(() => { jest.restoreAllMocks(); rmSync(directory, { recursive: true, force: true }); });

  test("creates unread alerts and preserves them on duplicate insertion", async () => {
    expect(await rules.createAlertIfMissing(alert)).toBe(true);
    const [stored] = await rules.getAlertsForRecipient("host");
    expect(stored).toMatchObject({ ...alert, status: "UNREAD", created_at: 1000, updated_at: 1000 });
    expect(stored.id).toEqual(expect.any(String));
    await rules.dismissAlert("host", stored.id);
    expect(await rules.createAlertIfMissing({ ...alert, property_id: "changed" })).toBe(false);
    expect(await rules.getAlertsForRecipient("host")).toEqual([{ ...stored, status: "DISMISSED", updated_at: 1001 }]);
  });

  test("same event can belong to different recipients; optional review is null", async () => {
    await rules.createAlertIfMissing(alert);
    await rules.createAlertIfMissing({ ...alert, recipient_user_id: "other", review_id: undefined });
    expect(await rules.getAlertsForRecipient("other")).toMatchObject([{ recipient_user_id: "other", review_id: null }]);
  });

  test.each(["LOW_RATING", "DECLINING_RATING", "RESPONSE_OVERDUE"])("stores alert type %s", async (alert_type) => {
    expect(await rules.createAlertIfMissing({ ...alert, alert_type, review_id: null })).toBe(true);
    expect(await rules.getAlertsForRecipient("host")).toMatchObject([{ alert_type }]);
  });

  test("recipient-scoped status filtering, stable newest-first ordering and pagination", async () => {
    for (let i = 0; i < 4; i++) {
      await rules.createAlertIfMissing({ ...alert, event_key: `event-${i}` });
    }
    const all = await rules.getAlertsForRecipient("host");
    expect(all.map((row) => row.id)).toEqual(all.map((row) => row.id).sort().reverse());
    expect(await rules.getAlertsForRecipient("host", { limit: 2, offset: 1 })).toEqual(all.slice(1, 3));
    await rules.markAlertAsRead("host", all[0].id);
    expect(await rules.getAlertsForRecipient("host", { status: "READ" })).toHaveLength(1);
    expect(await rules.getAlertsForRecipient("other")).toEqual([]);
    rules.now = () => 2000;
    await rules.createAlertIfMissing({ ...alert, event_key: "newer" });
    expect((await rules.getAlertsForRecipient("host"))[0].created_at).toBe(2000);
  });

  test("read/dismiss are recipient scoped and dismissed alerts cannot be reopened", async () => {
    await rules.createAlertIfMissing(alert);
    const [{ id }] = await rules.getAlertsForRecipient("host");
    expect(await rules.markAlertAsRead("other", id)).toBe(false);
    expect(await rules.dismissAlert("other", id)).toBe(false);
    expect(await rules.markAlertAsRead("host", id)).toBe(true);
    expect(await rules.markAlertAsRead("host", id)).toBe(false);
    expect(await rules.dismissAlert("host", id)).toBe(true);
    expect(await rules.dismissAlert("host", id)).toBe(false);
    expect(await rules.markAlertAsRead("host", id)).toBe(false);
    expect(await rules.dismissAlert("host", "missing")).toBe(false);
  });

  test("the unique constraint arbitrates concurrent workers using generated INSERT SQL", async () => {
    await rules.createAlertIfMissing(alert);
    const [sql, parameters] = queries[0];
    run("DELETE FROM review_alert", [], "run");
    const script = `const { Worker } = require('node:worker_threads');
      const [file, sql, values] = JSON.parse(process.argv[1]);
      const code = \`const { parentPort, workerData } = require('node:worker_threads');
        const { DatabaseSync } = require('node:sqlite');
        const db = new DatabaseSync(workerData.file, { timeout: 5000 });
        parentPort.postMessage(db.prepare(workerData.sql).all(...workerData.values).length); db.close();\`;
      Promise.all(Array.from({ length: 8 }, (_, i) => new Promise((resolve, reject) => {
        const worker = new Worker(code, { eval: true, workerData: { file, sql: sql.replace(/\\$\\d+/g, '?'),
          values: values.map((value, index) => index === 0 ? 'worker-' + i : value) } });
        worker.on('message', resolve); worker.on('error', reject);
      }))).then(results => console.log(JSON.stringify(results)));`;
    const results = JSON.parse(execFileSync(process.execPath, ["-e", script, JSON.stringify([file, sql, parameters])],
      { encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } }));
    expect(results.reduce((sum, value) => sum + value, 0)).toBe(1);
    expect(await rules.getAlertsForRecipient("host")).toHaveLength(1);
  });

  test.each([{ status: "INVALID" }, { limit: 0 }, { limit: 101 }, { offset: -1 }, { offset: 0.5 }])(
    "rejects invalid list options %j", async (options) => {
      await expect(rules.getAlertsForRecipient("host", options)).rejects.toThrow();
    });
  test("validates identity, event key and type before storage", async () => {
    for (const changes of [{ recipient_user_id: "" }, { property_id: null }, { event_key: "x".repeat(256) },
      { alert_type: "INVALID" }, { review_id: "" }]) {
      await expect(rules.createAlertIfMissing({ ...alert, ...changes })).rejects.toThrow();
    }
    await expect(rules.getAlertsForRecipient("")).rejects.toThrow();
    expect(queries).toEqual([]);
  });

  test("retries serialization conflicts but propagates unrelated failures", async () => {
    const conflict = Object.assign(new Error("retry"), { driverError: { code: "40001" } });
    const operation = jest.fn().mockRejectedValueOnce(conflict).mockResolvedValue(true);
    expect(await rules.execute(operation)).toBe(true);
    expect(operation).toHaveBeenCalledTimes(2);
    await expect(rules.execute(() => Promise.reject(conflict))).rejects.toBe(conflict);
    const failure = new Error("outage");
    await expect(rules.execute(() => Promise.reject(failure))).rejects.toBe(failure);
  });

  test("migration and metadata declare uniqueness, indexes, lengths and reversible schema creation", async () => {
    expect(Tables).toContain(Review_Alert);
    expect(ddl).toHaveLength(8);
    for (const schema of ["main", "test"]) {
      expect(ddl.join("\n")).toContain(`${schema}.review_alert`);
    }
    expect(ddl.join("\n")).toContain("UNIQUE (recipient_user_id, event_key)");
    expect(Review_Alert.options.uniques[0].columns).toEqual(["recipient_user_id", "event_key"]);
    expect(Review_Alert.options.indices).toHaveLength(3);
    expect(Review_Alert.options.columns.event_key.length).toBe(255);
    expect(Review_Alert.options.columns.created_at.transformer.from("1000")).toBe(1000);
    const query = jest.fn(); await new CreateReviewAlert20261113().down({ query });
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "DROP TABLE IF EXISTS main.review_alert;", "DROP TABLE IF EXISTS test.review_alert;",
    ]);
  });

  test("DSQL migration waits for asynchronous index builds and rejects failed builds", async () => {
    const runner = { connection: { options: { host: "cluster.dsql.us-east-1.on.aws" } },
      query: jest.fn(async (sql) => sql.startsWith("CREATE INDEX ASYNC") ? [{ job_id: "job" }]
        : sql.startsWith("SELECT") ? [{ ready: true }] : []) };
    await new CreateReviewAlert20261113().up(runner);
    expect(runner.query.mock.calls.filter(([sql]) => sql.startsWith("CREATE INDEX ASYNC"))).toHaveLength(6);
    expect(runner.query).toHaveBeenCalledWith("SELECT sys.wait_for_job($1) AS ready", ["job"]);
    runner.query.mockImplementation(async (sql) => sql.startsWith("SELECT") ? [{ ready: false }] : [{ job_id: "job" }]);
    await expect(new CreateReviewAlert20261113().up(runner)).rejects.toThrow("index creation failed");
  });
});
