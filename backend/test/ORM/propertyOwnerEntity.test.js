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
    indexes: [["", "property_owner_host_id_idx", "host_id"]],
  },
  {
    table: "property_owner_property",
    entity: Property_Owner_Property,
    columns: {
      id: ["uuid", false, null],
      owner_id: ["uuid", false, null],
      property_id: ["varchar", false, 255],
      host_id: ["varchar", false, 255],
      created_at: ["bigint", false, null],
    },
    indexes: [
      ["UNIQUE ", "property_owner_property_owner_property_unique", "owner_id, property_id"],
      ["", "property_owner_property_property_id_idx", "property_id"],
      ["", "property_owner_property_host_id_idx", "host_id"],
    ],
  },
];

const SQL_TYPES = { uuid: "uuid", varchar: "varchar", text: "text", bigint: "bigint" };

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

const columnLines = (sql, qualifiedTable) =>
  createTableBlock(sql, qualifiedTable)
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean);

const columnDefinitions = (sql, qualifiedTable) =>
  Object.fromEntries(
    columnLines(sql, qualifiedTable).map((line) => {
      const [name, typeToken] = line.split(/\s+/);
      const [, typeName, length] = /^(\w+)(?:\((\d+)\))?$/.exec(typeToken);
      const nullable = !/\bNOT NULL\b|\bPRIMARY KEY\b/i.test(line);
      return [name, [SQL_TYPES[typeName.toLowerCase()], nullable, length ? Number(length) : null]];
    })
  );

const indexesOn = (sql, qualifiedTable) =>
  [...sql.matchAll(/CREATE (UNIQUE )?INDEX ASYNC (?:IF NOT EXISTS )?(\w+)\s+ON (\w+\.\w+) \(([^)]+)\);/g)]
    .filter((match) => match[3] === qualifiedTable)
    .map(([, unique = "", name, , keyColumns]) => [unique, name, keyColumns])
    .sort();

const expectedIndexes = (indexes, suffix) =>
  indexes.map(([unique, name, keyColumns]) => [unique, `${name}${suffix}`, keyColumns]).sort();

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
  describe.each(TABLES)("$table", ({ table, columns, indexes }) => {
    it.each(SCHEMAS)("declares the entity columns for $schema", async ({ schema }) => {
      expect(columnDefinitions(await loadSql(), `${schema}.${table}`)).toEqual(columns);
    });

    it.each(SCHEMAS)("declares exactly the expected indexes with CREATE INDEX ASYNC for $schema", async ({ schema, suffix }) => {
      expect(indexesOn(await loadSql(), `${schema}.${table}`)).toEqual(expectedIndexes(indexes, suffix));
    });

    it.each(SCHEMAS)("generates the id in the database for $schema", async ({ schema }) => {
      expect(columnLines(await loadSql(), `${schema}.${table}`)).toContain("id UUID DEFAULT gen_random_uuid() PRIMARY KEY");
    });

    it.each(SCHEMAS)("declares no foreign key or CHECK constraint for $schema", async ({ schema }) => {
      expect(createTableBlock(await loadSql(), `${schema}.${table}`)).not.toMatch(/FOREIGN KEY|REFERENCES|CHECK\s*\(/i);
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
  const smokeBlocks = (sql) => [...sql.matchAll(/BEGIN;([\s\S]*?)ROLLBACK;/g)].map((match) => match[1]);

  it.each(SCHEMAS)("checks the unique pair and multiple owners per property in $schema", ({ schema }) => {
    const block = smokeBlocks(readOrmFile("migrations", "20261016_property_owner.sql")).find((candidate) =>
      candidate.includes(`INTO ${schema}.`)
    );
    expect(block).toMatch(/\bshould_be_one\b/);
    expect(block).toMatch(/\bowners_should_be_two\b/);
    expect(block).toMatch(/\bdefault_status_should_be_active\b/);
  });

  it("counts only the smoke rows in the final check, and lists every id the smoke tests insert", () => {
    const sql = readOrmFile("migrations", "20261016_property_owner.sql");
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
