import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";
import { Document } from "database/models/Document";
import { Document_Version } from "database/models/Document_Version";
import { Document_Relationship } from "database/models/Document_Relationship";
import { Document_Activity } from "database/models/Document_Activity";
import { Tables } from "../../ORM/util/database/Tables.js";
import { Document20261124 } from "../../ORM/migrations/20261124_document.js";

const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

const TABLES = [
  {
    table: "document",
    entity: Document,
    columns: {
      id: ["uuid", false, null],
      host_id: ["varchar", false, 255],
      title: ["varchar", false, 255],
      description: ["text", true, null],
      category: ["varchar", false, 50],
      status: ["varchar", false, 20],
      visibility: ["varchar", false, 20],
      review_status: ["varchar", true, 20],
      current_version_id: ["uuid", true, null],
      issue_date: ["bigint", true, null],
      expiration_date: ["bigint", true, null],
      created_by: ["varchar", false, 255],
      created_at: ["bigint", false, null],
      updated_at: ["bigint", false, null],
      archived_at: ["bigint", true, null],
      deleted_at: ["bigint", true, null],
    },
    indexes: [
      ["", "document_host_id_idx", "host_id", ""],
      ["", "document_host_id_category_idx", "host_id, category", ""],
      ["", "document_host_id_expiration_date_idx", "host_id, expiration_date", ""],
    ],
    checks: [],
  },
  {
    table: "document_version",
    entity: Document_Version,
    columns: {
      id: ["uuid", false, null],
      document_id: ["uuid", false, null],
      host_id: ["varchar", false, 255],
      version_number: ["int", false, null],
      storage_key: ["varchar", false, 1024],
      file_name: ["varchar", false, 255],
      mime_type: ["varchar", false, 100],
      file_size: ["bigint", false, null],
      checksum: ["varchar", true, 128],
      uploaded_by: ["varchar", false, 255],
      change_description: ["text", true, null],
      created_at: ["bigint", false, null],
    },
    indexes: [
      ["UNIQUE ", "document_version_document_id_version_number_unique", "document_id, version_number", ""],
      ["", "document_version_host_id_idx", "host_id", ""],
    ],
    checks: [
      ["document_version_version_number_check", "version_number >= 1"],
      ["document_version_file_size_check", "file_size > 0"],
    ],
  },
  {
    table: "document_relationship",
    entity: Document_Relationship,
    columns: {
      id: ["uuid", false, null],
      document_id: ["uuid", false, null],
      host_id: ["varchar", false, 255],
      entity_type: ["varchar", false, 50],
      entity_id: ["varchar", false, 255],
      created_by: ["varchar", false, 255],
      created_at: ["bigint", false, null],
    },
    indexes: [
      ["UNIQUE ", "document_relationship_document_entity_unique", "document_id, entity_type, entity_id", ""],
      ["", "document_relationship_host_id_entity_idx", "host_id, entity_type, entity_id", ""],
    ],
    checks: [],
  },
  {
    table: "document_activity",
    entity: Document_Activity,
    columns: {
      id: ["uuid", false, null],
      document_id: ["uuid", false, null],
      host_id: ["varchar", false, 255],
      actor_id: ["varchar", false, 255],
      action: ["varchar", false, 50],
      details: ["text", true, null],
      created_at: ["bigint", false, null],
    },
    indexes: [
      ["", "document_activity_document_id_created_at_idx", "document_id, created_at", ""],
      ["", "document_activity_host_id_idx", "host_id", ""],
    ],
    checks: [],
  },
];

const POSTGRES_MAX_IDENTIFIER_LENGTH = 63;

const SQL_TYPES = { uuid: "uuid", varchar: "varchar", text: "text", bigint: "bigint", integer: "int" };

const readOrmFile = (...parts) =>
  readFileSync(path.join(process.cwd(), "ORM", ...parts), "utf8").replaceAll("\r\n", "\n");

const recordQueries = async (run) => {
  const queries = [];
  await run({ query: async (sql) => queries.push(sql) });
  return queries.join("\n");
};

const SOURCES = [
  ["20261124_document.sql", async () => readOrmFile("migrations", "20261124_document.sql")],
  ["schema.psql", async () => readOrmFile("schema.psql")],
  ["20261124_document.js up()", () => recordQueries((runner) => new Document20261124().up(runner))],
];

const DROP_SOURCES = [
  ["20261124_document_rollback.sql", async () => readOrmFile("migrations", "20261124_document_rollback.sql")],
  ["20261124_document.js down()", () => recordQueries((runner) => new Document20261124().down(runner))],
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

  it.each(SCHEMAS)("defaults document.status to active and document.visibility to internal for $schema", async ({ schema }) => {
    const lines = columnLines(await loadSql(), `${schema}.document`);
    expect(lines).toContain("status VARCHAR(20) NOT NULL DEFAULT 'active'");
    expect(lines).toContain("visibility VARCHAR(20) NOT NULL DEFAULT 'internal'");
  });

  it.each(SCHEMAS)("keeps document_version immutable, without an updated_at column, for $schema", async ({ schema }) => {
    expect(Object.keys(columnDefinitions(await loadSql(), `${schema}.document_version`))).not.toContain("updated_at");
  });
});

describe("index and constraint names", () => {
  const names = SCHEMAS.flatMap(({ suffix }) =>
    TABLES.flatMap(({ indexes, checks }) => [
      ...indexes.map(([, name]) => `${name}${suffix}`),
      ...checks.map(([name]) => `${name}${suffix}`),
    ])
  );

  it("fit in a PostgreSQL identifier, so none is truncated", () => {
    names.forEach((name) => expect(name.length).toBeLessThanOrEqual(POSTGRES_MAX_IDENTIFIER_LENGTH));
  });

  it("are unique across both schemas", () => {
    expect(new Set(names).size).toBe(names.length);
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

  it("drops main before test", async () => {
    const drops = dropStatements(await loadSql());
    const lastMain = Math.max(...drops.map((drop, index) => (drop.startsWith("main.") ? index : -1)));
    const firstTest = drops.findIndex((drop) => drop.startsWith("test."));
    expect(lastMain).toBeLessThan(firstTest);
  });
});

describe("document entity defaults", () => {
  it("defaults status to active and visibility to internal, as the table does", async () => {
    const metadata = await loadMetadata(Document);
    expect(metadata.findColumnWithDatabaseName("status").default).toBe("active");
    expect(metadata.findColumnWithDatabaseName("visibility").default).toBe("internal");
  });
});

describe("migration SQL smoke tests", () => {
  const migrationSql = () => readOrmFile("migrations", "20261124_document.sql");

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

  const rowsById = (block, qualifiedTable) =>
    Object.fromEntries(
      inserts(block)
        .filter((insert) => insert.table === qualifiedTable)
        .map((insert) => [insert.row.id, insert])
    );

  const positiveBlock = (schema) =>
    smokeBlocks(migrationSql()).find((block) => inserts(block).some((insert) => insert.table === `${schema}.document`));

  const negativeInserts = (schema) =>
    smokeBlocks(migrationSql())
      .map(statements)
      .filter((blockStatements) => blockStatements.length === 1)
      .map(([statement]) => parseInsert(statement))
      .filter((insert) => insert?.table === `${schema}.document_version`);

  const smokeId = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;

  const expectedSmokeQueries = (schema, documentId) => {
    const document = `document_id = '${documentId}'`;
    return [
      [
        "default_status_should_be_active",
        `SELECT status AS default_status_should_be_active FROM ${schema}.document`,
        [`id = '${documentId}'`],
      ],
      [
        "default_visibility_should_be_internal",
        `SELECT visibility AS default_visibility_should_be_internal FROM ${schema}.document`,
        [`id = '${documentId}'`],
      ],
      ["versions_should_be_two", `SELECT count(*) AS versions_should_be_two FROM ${schema}.document_version`, [document]],
      [
        "relationships_should_be_two",
        `SELECT count(*) AS relationships_should_be_two FROM ${schema}.document_relationship`,
        [document],
      ],
      [
        "activities_should_be_two",
        `SELECT count(*) AS activities_should_be_two FROM ${schema}.document_activity`,
        [document],
      ],
    ];
  };

  it.each(SCHEMAS)("inserts the rows that collide with each unique index with ON CONFLICT DO NOTHING in $schema", ({ schema }) => {
    const block = positiveBlock(schema);
    const versions = rowsById(block, `${schema}.document_version`);
    const relationships = rowsById(block, `${schema}.document_relationship`);
    const documentId = smokeId(1);

    const firstVersion = versions[smokeId(2)];
    const secondVersion = versions[smokeId(3)];
    const repeatedVersion = versions[smokeId(4)];
    expect(firstVersion).toMatchObject({ onConflictDoNothing: false, row: { document_id: documentId, version_number: "1" } });
    expect(secondVersion).toMatchObject({ onConflictDoNothing: false, row: { document_id: documentId, version_number: "2" } });
    expect(repeatedVersion).toMatchObject({
      onConflictDoNothing: true,
      row: { document_id: documentId, version_number: "1" },
    });

    const link = relationships[smokeId(5)];
    const repeatedLink = relationships[smokeId(6)];
    const otherLink = relationships[smokeId(7)];
    const linkKey = ({ document_id, entity_type, entity_id }) => ({ document_id, entity_type, entity_id });
    expect(link).toMatchObject({ onConflictDoNothing: false, row: { document_id: documentId } });
    expect(repeatedLink).toMatchObject({ onConflictDoNothing: true, row: linkKey(link.row) });
    expect(otherLink).toMatchObject({ onConflictDoNothing: false, row: { document_id: documentId } });
    expect(linkKey(otherLink.row)).not.toEqual(linkKey(link.row));
  });

  it.each(SCHEMAS)("filters each smoke query on the condition it checks in $schema", ({ schema }) => {
    const block = positiveBlock(schema);

    expectedSmokeQueries(schema, smokeId(1)).forEach(([alias, head, conditions]) => {
      const query = statements(block).find((statement) => new RegExp(String.raw`\bAS ${alias}\b`).test(statement));
      const [actualHead, where = ""] = query.split(" WHERE ");
      expect(actualHead).toBe(head);
      expect(where.split(" AND ").filter(Boolean).sort()).toEqual([...conditions].sort());
    });
  });

  it.each(SCHEMAS)("tries each CHECK in its own rolled back block in $schema", ({ schema }) => {
    const negatives = negativeInserts(schema).map(({ row }) => row);
    const zeroVersion = negatives.filter((row) => row.version_number === "0");
    const emptyFile = negatives.filter((row) => row.file_size === "0");

    expect(negatives).toHaveLength(2);
    expect(zeroVersion).toHaveLength(1);
    expect(Number(zeroVersion[0].file_size)).toBeGreaterThan(0);
    expect(emptyFile).toHaveLength(1);
    expect(Number(emptyFile[0].version_number)).toBeGreaterThanOrEqual(1);
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

    expect(finalCheck.match(/count\(\*\)/g)).toHaveLength(SCHEMAS.length * TABLES.length);
    expect(finalCheck.match(/WHERE id IN \(SELECT id FROM smoke_ids\)/g)).toHaveLength(SCHEMAS.length * TABLES.length);
    expect(insertedIds.length).toBeGreaterThan(0);
    new Set(insertedIds).forEach((id) => expect(finalCheck).toContain(`('${id}'::uuid)`));
  });
});

describe("Tables registration", () => {
  it("registers the four document entities and builds the full entity list", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: Tables });
    await dataSource.buildMetadatas();
    const tableNames = dataSource.entityMetadatas.map((metadata) => metadata.tableName);
    expect(tableNames).toEqual(
      expect.arrayContaining(["document", "document_version", "document_relationship", "document_activity"])
    );
  });
});
