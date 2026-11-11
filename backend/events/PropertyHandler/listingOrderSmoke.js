// MANUAL VERIFICATION ONLY. Never run in CI.
//
// Proves, against a real Aurora DSQL database, what the mocked Jest tests cannot: that a guest feed returns
// listings in the approved-at order and that keyset pagination over that order has no duplicates and no gaps.
// The Jest tests check the SQL's shape. This checks the rows a database returns for it.
//
// It WRITES to the `test` schema. The rows it seeds are real ACTIVE listings: any guest feed that reads the test
// schema will show them until you clean up. Every row has an id starting with "smoke-piece-b-", so it is easy to
// find and never left behind silently.
//
// Safety rails (logic and tests: smokeSafety.js, test/PropertyHandler/smokeSafety.test.js):
//  - It refuses to run unless the data source schema is "test".
//  - Every command prints the cluster it is connected to (host, database, schema, region, AWS profile).
//  - `seed` and `cleanup --yes` write only when you type that exact host back as --target=<host>. The hints show a
//    placeholder, not the host, so you have to read it from the "Connected to" line yourself.
//  - That confirmation lives inside write() in smokeSafety.js, the only path this script has to a write: there is no
//    separate check before a statement that could be deleted on its own. read() refuses anything but a plain single
//    SELECT; smokeSafety.js says what that does and does not cover. A Jest test fails if this file ever issues SQL any
//    other way, or calls a repository or controller method that is not on its allowlist of reads.
//  - Nothing is deleted unless you run `cleanup --yes`.
//
// What the rails do not guarantee: the script cannot tell a development cluster from a production one. They make you
// read which cluster you are connected to and type it back. Recognizing it is still your job, so run this only with
// credentials for an environment where extra rows in the test schema are acceptable.
//
// Known limit: cleanup removes rows by the "smoke-piece-b-" id prefix only. An event another tool adds later to a
// smoke property under a different id is not removed.
//
// Needs an AWS session for the Domits developer role (`aws sso login`) and Node 20.6 or newer.
//
//   cd backend
//   node events/PropertyHandler/listingOrderSmoke.js walk all                         read-only check of a feed
//   node events/PropertyHandler/listingOrderSmoke.js seed --target=<host>             add the smoke rows (once)
//   node events/PropertyHandler/listingOrderSmoke.js cleanup                          show what cleanup would remove
//   node events/PropertyHandler/listingOrderSmoke.js cleanup --yes --target=<host>    remove the smoke rows
//   (<host> is the host from the "Connected to" line, typed or pasted by you.)
//
// `walk` exits non-zero when any check fails. To cover another feed, add an entry to FEEDS: the walk steps
// below only use what a feed supplies (page, reference, helperOrder, controller).

import { register } from "node:module";
import {
  RefusedError,
  TARGET_HINT,
  assertTestSchema,
  describeTarget,
  formatTarget,
  read,
  write,
} from "./smokeSafety.js";

process.env.TEST = "true"; // makes Database use the "test" schema; read when the connection opens

// The handlers import "../../.shared/...", which exists only once deployed. Jest maps it to
// backend/functions/.shared; do the same here so the real repositories load under plain Node.
const BACKEND = new URL("../../", import.meta.url);
const SHARED = new URL("functions/.shared/", BACKEND).href;
register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(specifier, context, nextResolve) {
         const match = /^(?:\\.\\.\\/)+\\.shared\\/(.+)$/.exec(specifier);
         return nextResolve(match ? new URL(match[1], ${JSON.stringify(SHARED)}).href : specifier, context);
       }`
    )
);

const loadFromBackend = (relativePath) => import(new URL(relativePath, BACKEND).href);
const { default: Database } = await import("database");
const { Property } = await import("database/models/Property");
const { Property_Moderation_Event } = await import("database/models/Property_Moderation_Event");
const { PropertyRepository } = await loadFromBackend("functions/PropertyHandler/data/repository/propertyRepository.js");
const { PropertyController } = await loadFromBackend("functions/PropertyHandler/controller/propertyController.js");
const { NotFoundException } = await loadFromBackend("functions/PropertyHandler/util/exception/NotFoundException.js");
const { joinLatestApproval, orderByListingPosition } = await loadFromBackend(
  "functions/PropertyHandler/data/repository/listingPosition.js"
);

const PREFIX = "smoke-piece-b-";
const PAGE_SIZE = 12;
const BASE = 1_000_000_000_000; // older than any real row, so the smoke rows form a block inside each group
const id =(n) => `${PREFIX}${String(n).padStart(2, "0")}`;

// Known timings. `events` are [action, createdAt]. Covers: never approved, ties on createdAt, ties on approval,
// the latest of several approvals, and events that are not approvals.
const SEEDS = [
  { n: 1, createdat: BASE + 1000, events: [] },
  { n: 2, createdat: BASE + 3000, events: [] },
  { n: 3, createdat: BASE + 3000, events: [] },
  { n: 4, createdat: BASE + 2000, events: [["SUBMITTED", BASE + 9000], ["REJECTED", BASE + 9500]] },
  { n: 5, createdat: BASE + 100, events: [["APPROVED", BASE + 5000]] },
  { n: 6, createdat: BASE + 100, events: [["APPROVED", BASE + 5000]] },
  { n: 7, createdat: BASE + 900, events: [["APPROVED", BASE + 2000]] },
  { n: 8, createdat: BASE + 100, events: [["APPROVED", BASE + 2000]] },
  { n: 9, createdat: BASE + 500, events: [["APPROVED", BASE + 3000], ["APPROVED", BASE + 8000]] },
  { n: 10, createdat: BASE + 700, events: [["APPROVED", BASE + 4000], ["REJECTED", BASE + 9999]] },
];

const approvedAtOf = (seed) => Math.max(0, ...seed.events.filter(([action]) => action === "APPROVED").map(([, at]) => at));
// The order the rules imply, from the seed definitions alone, so the database is not the only judge.
const EXPECTED_SMOKE_ORDER = [...SEEDS]
  .sort((a, b) => approvedAtOf(a) - approvedAtOf(b) || b.createdat - a.createdat || (id(a.n) < id(b.n) ? 1 : -1))
  .map((seed) => id(seed.n));

const countWhere = async (client, table) =>
  Number((await read(client, `SELECT COUNT(*) AS n FROM test.${table} WHERE id LIKE $1`, [`${PREFIX}%`]))[0].n);

// ---- connection ------------------------------------------------------------------------------------------------
const connect = async () => {
  const client = await Database.getInstance();
  const target = describeTarget(client, Database.region, process.env.AWS_PROFILE ?? "(default credentials)");
  console.log(`${formatTarget(target)}\n`);
  assertTestSchema(target);
  return { client, target };
};

// ---- feeds -----------------------------------------------------------------------------------------------------
// A feed supplies: page(cursor) -> the shipped repository call; reference() -> every row in the expected order,
// built without the code under test; helperOrder() -> the join helper's order; controller(params) -> the real
// controller, for the string query path.
const FEEDS = {
  all: (client) => {
    const repository = new PropertyRepository({});
    const approvedAt = (query) =>
      query
        .subQuery()
        .select("COALESCE(MAX(event.createdAt), 0)")
        .from(Property_Moderation_Event, "event")
        .where("event.propertyId = property.id")
        .andWhere("event.action = :approved")
        .getQuery();
    return {
      page: (cursor) => repository.getActiveProperties(cursor),
      // Piece A's correlated subquery, unpaged. Selects two columns because test.property can lag the entity.
      reference: async () => {
        const query = client.getRepository(Property).createQueryBuilder("property");
        const rows = await query
          .select(["property.id", "property.createdat"])
          .where("property.status = :status", { status: "ACTIVE" })
          .setParameter("approved", "APPROVED")
          .addSelect(approvedAt(query), "approved_at")
          .orderBy("approved_at", "ASC")
          .addOrderBy("property.createdat", "DESC")
          .addOrderBy("property.id", "DESC")
          .getRawMany();
        return rows.map((row) => ({ id: row.property_id, createdAt: Number(row.property_createdat) }));
      },
      helperOrder: async () => {
        const query = client
          .getRepository(Property)
          .createQueryBuilder("property")
          .select(["property.id", "property.createdat"])
          .where("property.status = :status", { status: "ACTIVE" });
        const rows = await orderByListingPosition(joinLatestApproval(query)).getRawMany();
        return rows.map((row) => row.property_id);
      },
      controller: (queryStringParameters) => {
        const controller = new PropertyController();
        controller.propertyService = { getActivePropertyCards: (cursor) => repository.getActiveProperties(cursor) };
        return controller.getActivePropertiesCard({ httpMethod: "GET", queryStringParameters });
      },
    };
  },
};

// ---- write commands --------------------------------------------------------------------------------------------
const seed = async () => {
  const { client, target } = await connect();
  const existing = await countWhere(client, "property");
  if (existing === SEEDS.length) {
    console.log(`Already seeded: ${existing} ${PREFIX}* properties. Nothing written.`);
    return;
  }
  if (existing !== 0) {
    throw new RefusedError(`Refusing to seed: ${existing} partial ${PREFIX}* rows exist. Run cleanup first.`);
  }
  for (const entry of SEEDS) {
    await write(
      target,
      process.argv,
      client,
      `INSERT INTO test.property (id, title, subtitle, description, registrationnumber, hostid, status, createdat, updatedat)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $7)`,
      [
        id(entry.n),
        `${PREFIX}test listing ${entry.n}`,
        PREFIX.slice(0, -1),
        `Inserted by listingOrderSmoke.js. Remove with: id LIKE '${PREFIX}%'`,
        `${PREFIX}reg-${entry.n}`,
        `${PREFIX}host`,
        entry.createdat,
      ]
    );
    let sequence = 0;
    for (const [action, createdAt] of entry.events) {
      sequence += 1;
      await write(
        target,
        process.argv,
        client,
        `INSERT INTO test.property_moderation_event (id, property_id, action, actor_id, from_status, to_status, created_at)
         VALUES ($1, $2, $3, $4, 'PENDING_REVIEW', $5, $6)`,
        [`${PREFIX}evt-${String(entry.n).padStart(2, "0")}-${sequence}`, id(entry.n), action, `${PREFIX}actor`, action === "APPROVED" ? "ACTIVE" : action, createdAt]
      );
    }
  }
  console.log(`Seeded ${SEEDS.length} ${PREFIX}* properties and their moderation events in schema test.`);
};

const cleanup = async (confirmed) => {
  const { client, target } = await connect();
  const properties = await countWhere(client, "property");
  const events = await countWhere(client, "property_moderation_event");
  console.log(`${PREFIX}* rows in schema test: ${properties} properties, ${events} moderation events.`);
  if (!confirmed) {
    console.log(`Nothing deleted. To delete exactly those rows, run again with: --yes ${TARGET_HINT}`);
    return;
  }
  await write(target, process.argv, client, `DELETE FROM test.property_moderation_event WHERE id LIKE $1`, [`${PREFIX}%`]);
  await write(target, process.argv, client, `DELETE FROM test.property WHERE id LIKE $1`, [`${PREFIX}%`]);
  console.log("Deleted.");
};

// ---- walk steps -------------------------------------------------------------------------------------------------
// Each step takes the feed and the shared context and returns its results: [{ label, passed, detail }].
const result = (label, passed, detail = "") => ({ label, passed, detail });
const sameList = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const checkReferenceOrder = async (feed, { referenceIds }) => {
  const smokeOrder = referenceIds.filter((rowId) => rowId.startsWith(PREFIX));
  const results = [result("reference order puts the smoke rows where the rules say", sameList(smokeOrder, EXPECTED_SMOKE_ORDER))];
  if (feed.helperOrder) {
    results.push(result("join helper order equals the correlated reference", sameList(await feed.helperOrder(), referenceIds)));
  }
  return results;
};

// What a client does: JSON in, parseFloat on the number, id as is.
const toClientCursor = (key) => key && { createdAt: parseFloat(String(key.createdAt)), id: key.id };

const walkWholeFeed = async (feed) => {
  const ids = [];
  const pageSizes = [];
  let cursor;
  for (let guard = 0; guard < 1000; guard++) {
    let page;
    try {
      page = await feed.page(cursor);
    } catch (error) {
      if (error instanceof NotFoundException) break;
      throw error;
    }
    pageSizes.push(page.identifiers.length);
    ids.push(...page.identifiers);
    cursor = toClientCursor(page.lastEvaluatedKey);
  }
  return { ids, pageSizes };
};

const checkPageThrough = async (feed, { referenceIds }) => {
  const first = await walkWholeFeed(feed);
  const second = await walkWholeFeed(feed);
  const complete = first.ids.length === referenceIds.length && referenceIds.every((rowId) => first.ids.includes(rowId));
  return [
    result("page-through: no duplicates", new Set(first.ids).size === first.ids.length),
    result("page-through: no gaps, total equals the reference", complete, `${first.ids.length}/${referenceIds.length} in ${first.pageSizes.length} pages`),
    result("page-through: order equals the reference", sameList(first.ids, referenceIds)),
    result("page-through: a second walk is identical (stable)", sameList(first.ids, second.ids)),
  ];
};

// The page after row i must be exactly the next PAGE_SIZE rows, whatever the page boundaries happen to be.
const checkResumeFromEveryCursor = async (feed, { reference, referenceIds }) => {
  const mismatches = [];
  let lastCursorEndsWith404 = false;
  for (let i = 0; i < reference.length; i++) {
    const expected = referenceIds.slice(i + 1, i + 1 + PAGE_SIZE);
    let page;
    let error;
    try {
      page = await feed.page({ createdAt: reference[i].createdAt, id: reference[i].id });
    } catch (caught) {
      error = caught;
    }
    if (expected.length === 0) {
      lastCursorEndsWith404 = error instanceof NotFoundException;
    } else if (error || !sameList(page.identifiers, expected)) {
      mismatches.push(reference[i].id);
    }
  }
  return [
    result(`resume from every cursor position (${reference.length})`, mismatches.length === 0, mismatches.slice(0, 3).join(",")),
    result("a cursor at the last row ends the feed with 404", lastCursorEndsWith404),
  ];
};

const checkUnknownCursor = async (feed) => {
  let error;
  try {
    await feed.page({ createdAt: 1700000000000, id: `${PREFIX}does-not-exist` });
  } catch (caught) {
    error = caught;
  }
  return [result("unknown cursor id is a 400 from the repository", error?.statusCode === 400, error?.message)];
};

const checkControllerPaths = async (feed, { referenceIds }) => {
  const logError = console.error;
  console.error = () => {}; // the controller logs the expected 400
  try {
    const firstPage = JSON.parse((await feed.controller(undefined)).body);
    const secondPage = await feed.controller({
      lastEvaluatedKeyCreatedAt: String(firstPage.lastEvaluatedKey.createdAt),
      lastEvaluatedKeyId: firstPage.lastEvaluatedKey.id,
    });
    const unknownCursor = await feed.controller({
      lastEvaluatedKeyCreatedAt: "1700000000000",
      lastEvaluatedKeyId: `${PREFIX}does-not-exist`,
    });
    const nullStrings = await feed.controller({ lastEvaluatedKeyCreatedAt: "null", lastEvaluatedKeyId: "null" });
    return [
      result("controller: string query cursor returns the next reference slice", sameList(JSON.parse(secondPage.body).identifiers, referenceIds.slice(PAGE_SIZE, PAGE_SIZE * 2))),
      result("controller: unknown cursor id is HTTP 400", unknownCursor.statusCode === 400),
      result('controller: "null" strings from an old client return page 1', sameList(JSON.parse(nullStrings.body).identifiers, firstPage.identifiers)),
    ];
  } finally {
    console.error = logError;
  }
};

const WALK_STEPS = [checkReferenceOrder, checkPageThrough, checkResumeFromEveryCursor, checkUnknownCursor, checkControllerPaths];

const walk = async (feedName) => {
  if (!FEEDS[feedName]) throw new RefusedError(`Unknown feed "${feedName}". Known: ${Object.keys(FEEDS).join(", ")}`);
  const { client } = await connect();
  if ((await countWhere(client, "property")) !== SEEDS.length) {
    throw new RefusedError(`Expected the ${SEEDS.length} ${PREFIX}* rows. Run: node events/PropertyHandler/listingOrderSmoke.js seed ${TARGET_HINT}`);
  }
  const feed = FEEDS[feedName](client);
  const reference = await feed.reference();
  const context = { reference, referenceIds: reference.map((row) => row.id) };
  console.log(`feed "${feedName}": ${reference.length} rows in the reference order\n`);

  const failures = [];
  for (const step of WALK_STEPS) {
    for (const { label, passed, detail } of await step(feed, context)) {
      console.log(`${passed ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
      if (!passed) failures.push(label);
    }
  }
  console.log(failures.length === 0 ? "\nALL CHECKS PASSED" : `\n${failures.length} CHECK(S) FAILED`);
  process.exitCode = failures.length === 0 ? 0 : 1;
};

const [command, argument] = process.argv.slice(2);
try {
  if (command === "seed") await seed();
  else if (command === "walk") await walk(argument ?? "all");
  else if (command === "cleanup") await cleanup(process.argv.includes("--yes"));
  else {
    console.log("Usage: node events/PropertyHandler/listingOrderSmoke.js walk [feed] | seed --target=<host> | cleanup [--yes --target=<host>]");
    process.exitCode = 2;
  }
} catch (error) {
  // A refusal is an expected outcome and reads as one. Anything else is a bug or an outage and keeps its stack.
  if (!(error instanceof RefusedError)) {
    throw error;
  }
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (Database.pool?.isInitialized) await Database.pool.destroy();
}
