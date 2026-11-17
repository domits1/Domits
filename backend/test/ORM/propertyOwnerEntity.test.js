import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";
import { Property_Owner } from "database/models/Property_Owner";
import { Property_Owner_Property } from "database/models/Property_Owner_Property";
import { Tables } from "../../ORM/util/database/Tables.js";
import { PropertyOwner20261016 } from "../../ORM/migrations/20261016_property_owner.js";

const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

const TABLES = [
  {
    table: "property_owner",
    entity: Property_Owner,
    columns: {
      id: ["uuid", false, null],
      host_id: ["varchar", false, 255],
      first_name: ["varchar", false, 100],
      last_name: ["varchar", false, 100],
      company_name: ["varchar", true, 200],
      email: ["varchar", false, 254],
      phone: ["varchar", true, 50],
      preferred_language: ["varchar", true, 10],
      owner_type: ["varchar", false, 20],
      status: ["varchar", false, 20],
      notes: ["text", true, null],
      owner_user_id: ["varchar", true, 255],
      created_at: ["bigint", false, null],
      updated_at: ["bigint", false, null],
    },
    indexes: [["", "property_owner_host_id_idx", "host_id", ""]],
    checks: [],
  },
  {
    table: "property_owner_property",
    entity: Property_Owner_Property,
    columns: {
      id: ["uuid", false, null],
      owner_id: ["uuid", false, null],
      property_id: ["varchar", false, 255],
      host_id: ["varchar", false, 255],
      ownership_basis_points: ["int", false, null],
      effective_from: ["bigint", false, null],
      effective_to: ["bigint", true, null],
      created_at: ["bigint", false, null],
      updated_at: ["bigint", false, null],
    },
    indexes: [
      ["UNIQUE ", "property_owner_property_owner_property_from_unique", "owner_id, property_id, effective_from", ""],
      ["UNIQUE ", "property_owner_property_open_unique", "owner_id, property_id", "effective_to IS NULL"],
      ["", "property_owner_property_property_id_idx", "property_id", ""],
      ["", "property_owner_property_host_id_idx", "host_id", ""],
    ],
    checks: [
      ["property_owner_property_basis_points_check", "ownership_basis_points BETWEEN 1 AND 10000"],
      ["property_owner_property_period_check", "effective_to IS NULL OR effective_to > effective_from"],
    ],
  },
];

const SQL_TYPES = { uuid: "uuid", varchar: "varchar", text: "text", bigint: "bigint", integer: "int" };

const readOrmFile = (...parts) =>
  readFileSync(path.join(process.cwd(), "ORM", ...parts), "utf8").replaceAll("\r\n", "\n");

const recordQueries = async (run) => {
  const queries = [];
  await run({ query: async (sql) => queries.push(sql) });
  return queries.join("\n");
};

const SOURCES = [
  ["20261016_property_owner.sql", async () => readOrmFile("migrations", "20261016_property_owner.sql")],
  ["schema.psql", async () => readOrmFile("schema.psql")],
  ["20261016_property_owner.js up()", () => recordQueries((runner) => new PropertyOwner20261016().up(runner))],
];

const DROP_SOURCES = [
  ["20261016_property_owner_rollback.sql", async () => readOrmFile("migrations", "20261016_property_owner_rollback.sql")],
  ["20261016_property_owner.js down()", () => recordQueries((runner) => new PropertyOwner20261016().down(runner))],
];

const loadMetadata = async (entity) => {
  const dataSource = new DataSource({ type: "postgres", entities: [entity] });
  await dataSource.buildMetadatas();
  return dataSource.getMetadata(entity);
};

const createTableBlock = (sql, qualifiedTable) => {
  const match = new RegExp(
    String.raw`CREATE TABLE IF NOT EXISTS ${qualifiedTable.replace(".", String.raw`\.`)} \(([\s\S]*?)\n\s*\);`
  ).exec(sql);
  if (!match) throw new Error(`No CREATE TABLE block found for ${qualifiedTable}`);
  return match[1];
};

const isConstraintLine = (line) => /^CONSTRAINT\b/i.test(line);

const blockLines = (sql, qualifiedTable) =>
  createTableBlock(sql, qualifiedTable)
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean);

const columnLines = (sql, qualifiedTable) => blockLines(sql, qualifiedTable).filter((line) => !isConstraintLine(line));

const columnDefinitions = (sql, qualifiedTable) =>
  Object.fromEntries(
    columnLines(sql, qualifiedTable).map((line) => {
      const [name, typeToken] = line.split(/\s+/);
      const [, typeName, length] = /^(\w+)(?:\((\d+)\))?$/.exec(typeToken);
      const nullable = !/\bNOT NULL\b|\bPRIMARY KEY\b/i.test(line);
      return [name, [SQL_TYPES[typeName.toLowerCase()], nullable, length ? Number(length) : null]];
    })
  );

const checkConstraints = (sql, qualifiedTable) =>
  blockLines(sql, qualifiedTable)
    .filter(isConstraintLine)
    .map((line) => {
      const match = /^CONSTRAINT (\w+) CHECK \((.+)\)$/i.exec(line);
      if (!match) throw new Error(`Unexpected constraint in ${qualifiedTable}: ${line}`);
      return [match[1], match[2]];
    })
    .sort();

const expectedChecks = (checks, suffix) => checks.map(([name, expression]) => [`${name}${suffix}`, expression]).sort();

const normalizePredicate = (predicate = "") => predicate.replaceAll(/\s+/g, " ").trim();

const indexesOn = (sql, qualifiedTable) =>
  [
    ...sql.matchAll(
      /CREATE (UNIQUE )?INDEX ASYNC (?:IF NOT EXISTS )?(\w+)\s+ON (\w+\.\w+) \(([^)]+)\)(?:\s+WHERE ([^;]+?))?\s*;/g
    ),
  ]
    .filter((match) => match[3] === qualifiedTable)
    .map(([, unique = "", name, , keyColumns, predicate]) => [unique, name, keyColumns, normalizePredicate(predicate)])
    .sort();

const expectedIndexes = (indexes, suffix) =>
  indexes.map(([unique, name, keyColumns, predicate]) => [unique, `${name}${suffix}`, keyColumns, predicate]).sort();

const dropStatements = (sql) => [...sql.matchAll(/DROP (INDEX|TABLE) IF EXISTS (\w+\.\w+);/g)].map((match) => match[2]);

describe.each(TABLES)("$table entity", ({ table, entity, columns }) => {
  it("maps the columns, types, nullability and lengths of the table", async () => {
    const metadata = await loadMetadata(entity);
    const mapped = Object.fromEntries(
      metadata.columns.map((c) => [c.databaseName, [c.type, c.isNullable, c.length ? Number(c.length) : null]])
    );
    expect(metadata.tableName).toBe(table);
    expect(mapped).toEqual(columns);
  });

  it("uses a database generated uuid id as the only primary column", async () => {
    const metadata = await loadMetadata(entity);
    expect(metadata.primaryColumns.map((c) => c.databaseName)).toEqual(["id"]);
    expect(metadata.findColumnWithDatabaseName("id").generationStrategy).toBe("uuid");
  });
});

describe.each(SOURCES)("%s", (_label, loadSql) => {
  describe.each(TABLES)("$table", ({ table, columns, indexes, checks }) => {
    it.each(SCHEMAS)("declares the entity columns for $schema", async ({ schema }) => {
      expect(columnDefinitions(await loadSql(), `${schema}.${table}`)).toEqual(columns);
    });

    it.each(SCHEMAS)("declares exactly the expected indexes with CREATE INDEX ASYNC for $schema", async ({ schema, suffix }) => {
      expect(indexesOn(await loadSql(), `${schema}.${table}`)).toEqual(expectedIndexes(indexes, suffix));
    });

    it.each(SCHEMAS)("generates the id in the database for $schema", async ({ schema }) => {
      expect(columnLines(await loadSql(), `${schema}.${table}`)).toContain("id UUID DEFAULT gen_random_uuid() PRIMARY KEY");
    });

    it.each(SCHEMAS)("declares no foreign key for $schema", async ({ schema }) => {
      expect(createTableBlock(await loadSql(), `${schema}.${table}`)).not.toMatch(/FOREIGN KEY|REFERENCES/i);
    });

    it.each(SCHEMAS)("declares exactly the expected named CHECK constraints for $schema", async ({ schema, suffix }) => {
      const sql = await loadSql();
      const block = createTableBlock(sql, `${schema}.${table}`);
      expect(checkConstraints(sql, `${schema}.${table}`)).toEqual(expectedChecks(checks, suffix));
      expect(block.match(/CHECK\s*\(/gi) ?? []).toHaveLength(checks.length);
    });

    it.each(SCHEMAS)("adds no constraint after the CREATE TABLE for $schema", async ({ schema }) => {
      expect(await loadSql()).not.toMatch(new RegExp(String.raw`ALTER TABLE (IF EXISTS )?${schema}\.${table}\s`, "i"));
    });
  });

  it.each(SCHEMAS)("defaults property_owner.status to active for $schema", async ({ schema }) => {
    expect(columnLines(await loadSql(), `${schema}.property_owner`)).toContain(
      "status VARCHAR(20) NOT NULL DEFAULT 'active'"
    );
  });
});

describe.each(DROP_SOURCES)("%s", (_label, loadSql) => {
  const expectedDrops = SCHEMAS.flatMap(({ schema, suffix }) =>
    TABLES.flatMap(({ table, indexes }) => [
      ...indexes.map(([, name]) => `${schema}.${name}${suffix}`),
      `${schema}.${table}`,
    ])
  );

  it("drops every index and table the migration creates, in both schemas", async () => {
    expect(dropStatements(await loadSql()).sort()).toEqual([...expectedDrops].sort());
  });

  it("drops each index before the table it belongs to", async () => {
    const drops = dropStatements(await loadSql());
    SCHEMAS.forEach(({ schema, suffix }) =>
      TABLES.forEach(({ table, indexes }) =>
        indexes.forEach(([, name]) =>
          expect(drops.indexOf(`${schema}.${name}${suffix}`)).toBeLessThan(drops.indexOf(`${schema}.${table}`))
        )
      )
    );
  });
});

describe("property_owner entity defaults", () => {
  it("defaults status to active, as the table does", async () => {
    const metadata = await loadMetadata(Property_Owner);
    expect(metadata.findColumnWithDatabaseName("status").default).toBe("active");
  });
});

describe("migration SQL smoke tests", () => {
  const migrationSql = () => readOrmFile("migrations", "20261016_property_owner.sql");

  const smokeBlocks = (sql) => [...sql.matchAll(/BEGIN;([\s\S]*?)ROLLBACK;/g)].map((match) => match[1]);

  const statements = (block) =>
    block
      .split(";")
      .map((statement) => statement.replaceAll(/\s+/g, " ").trim())
      .filter(Boolean);

  const parseInsert = (statement) => {
    const match = /^INSERT INTO (\w+\.\w+) \(([^)]*)\) VALUES \((.*?)\)( ON CONFLICT DO NOTHING)?$/.exec(statement);
    if (!match) return null;
    const [, table, columnList, valueList, onConflict] = match;
    const values = valueList.split(/,\s*/).map((value) => (value === "NULL" ? null : value.replaceAll(/^'|'$/g, "")));
    const row = Object.fromEntries(columnList.split(/,\s*/).map((column, index) => [column, values[index]]));
    return { table, row, onConflictDoNothing: Boolean(onConflict) };
  };

  const inserts = (block) => statements(block).map(parseInsert).filter(Boolean);

  const assignmentsById = (block, schema) =>
    Object.fromEntries(
      inserts(block)
        .filter((insert) => insert.table === `${schema}.property_owner_property`)
        .map((insert) => [insert.row.id, insert])
    );

  const positiveBlock = (schema) =>
    smokeBlocks(migrationSql()).find((block) =>
      inserts(block).some((insert) => insert.table === `${schema}.property_owner`)
    );

  const negativeInserts = (schema) =>
    smokeBlocks(migrationSql())
      .map(statements)
      .filter((blockStatements) => blockStatements.length === 1)
      .map(([statement]) => parseInsert(statement))
      .filter((insert) => insert?.table === `${schema}.property_owner_property`);

  const smokeId = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;

  const conflictKey = ({ owner_id, property_id }) => ({ owner_id, property_id });

  const expectedSmokeQueries = (schema, open) => {
    const owner = `owner_id = '${open.owner_id}'`;
    const property = `property_id = '${open.property_id}'`;
    return [
      [
        "default_status_should_be_active",
        `SELECT status AS default_status_should_be_active FROM ${schema}.property_owner`,
        [`id = '${open.owner_id}'`],
      ],
      [
        "should_be_one",
        `SELECT count(*) AS should_be_one FROM ${schema}.property_owner_property`,
        [owner, property, `effective_from = ${open.effective_from}`],
      ],
      [
        "periods_should_be_two",
        `SELECT count(*) AS periods_should_be_two FROM ${schema}.property_owner_property`,
        [owner, property],
      ],
      [
        "open_should_be_one",
        `SELECT count(*) AS open_should_be_one FROM ${schema}.property_owner_property`,
        [owner, property, "effective_to IS NULL"],
      ],
      [
        "owners_should_be_two",
        `SELECT count(DISTINCT owner_id) AS owners_should_be_two FROM ${schema}.property_owner_property`,
        [property, "effective_to IS NULL"],
      ],
    ];
  };

  it.each(SCHEMAS)("inserts the rows that collide with each unique index with ON CONFLICT DO NOTHING in $schema", ({ schema }) => {
    const rows = assignmentsById(positiveBlock(schema), schema);
    const open = rows[smokeId(4)];
    const sameStart = rows[smokeId(5)];
    const secondOpen = rows[smokeId(6)];
    const otherOwner = rows[smokeId(7)];

    expect(open).toMatchObject({ onConflictDoNothing: false, row: { effective_to: null } });

    expect(sameStart).toMatchObject({ onConflictDoNothing: true, row: conflictKey(open.row) });
    expect(sameStart.row.effective_from).toBe(open.row.effective_from);
    expect(sameStart.row.effective_to).not.toBeNull();

    expect(secondOpen).toMatchObject({ onConflictDoNothing: true, row: { ...conflictKey(open.row), effective_to: null } });
    expect(secondOpen.row.effective_from).not.toBe(open.row.effective_from);

    expect(otherOwner).toMatchObject({
      onConflictDoNothing: false,
      row: { property_id: open.row.property_id, effective_to: null },
    });
    expect(otherOwner.row.owner_id).not.toBe(open.row.owner_id);
  });

  it.each(SCHEMAS)("filters each smoke query on the condition it checks in $schema", ({ schema }) => {
    const block = positiveBlock(schema);
    const open = assignmentsById(block, schema)[smokeId(4)].row;

    expectedSmokeQueries(schema, open).forEach(([alias, head, conditions]) => {
      const query = statements(block).find((statement) => new RegExp(String.raw`\bAS ${alias}\b`).test(statement));
      const [actualHead, where = ""] = query.split(" WHERE ");
      expect(actualHead).toBe(head);
      expect(where.split(" AND ").filter(Boolean).sort()).toEqual([...conditions].sort());
    });
  });

  it.each(SCHEMAS)("tries each CHECK in its own rolled back block in $schema", ({ schema }) => {
    const negatives = negativeInserts(schema).map(({ row }) => row);
    const zeroShare = negatives.filter((row) => row.ownership_basis_points === "0");
    const emptyPeriod = negatives.filter((row) => row.effective_to === row.effective_from);

    expect(negatives).toHaveLength(2);
    expect(zeroShare).toHaveLength(1);
    expect(zeroShare[0].effective_to).toBeNull();
    expect(emptyPeriod).toHaveLength(1);
    expect(Number(emptyPeriod[0].ownership_basis_points)).toBeGreaterThanOrEqual(1);
    expect(Number(emptyPeriod[0].ownership_basis_points)).toBeLessThanOrEqual(10000);
  });

  it("ends every transaction in ROLLBACK and never commits", () => {
    const sql = migrationSql();
    expect(sql).not.toMatch(/\bCOMMIT\b/i);
    expect(sql.match(/^BEGIN;$/gm)).toHaveLength(sql.match(/^ROLLBACK;$/gm).length);
    expect(smokeBlocks(sql).every((block) => !/\bBEGIN;/.test(block))).toBe(true);
  });

  it("counts only the smoke rows in the final check, and lists every id the smoke tests insert", () => {
    const sql = migrationSql();
    const finalCheck = sql.slice(sql.lastIndexOf("ROLLBACK;"));
    const insertedIds = smokeBlocks(sql).flatMap((block) =>
      [...block.matchAll(/INSERT INTO \w+\.\w+ \([^)]*\)\s*VALUES \('([^']+)'/g)].map((match) => match[1])
    );

    expect(finalCheck.match(/count\(\*\)/g)).toHaveLength(4);
    expect(finalCheck.match(/WHERE id IN \(SELECT id FROM smoke_ids\)/g)).toHaveLength(4);
    expect(insertedIds.length).toBeGreaterThan(0);
    new Set(insertedIds).forEach((id) => expect(finalCheck).toContain(`('${id}'::uuid)`));
  });
});

describe("Tables registration", () => {
  it("registers both entities and builds the full entity list", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: Tables });
    await dataSource.buildMetadatas();
    const tableNames = dataSource.entityMetadatas.map((metadata) => metadata.tableName);
    expect(tableNames).toEqual(expect.arrayContaining(["property_owner", "property_owner_property"]));
  });
});
