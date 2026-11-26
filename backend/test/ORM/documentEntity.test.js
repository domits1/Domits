import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { Document } from "database/models/Document";
import { Document_Version } from "database/models/Document_Version";
import { Tables } from "../../ORM/util/database/Tables.js";
import { Document20261124 } from "../../ORM/migrations/20261124_document.js";
import {
  columnDefinitions,
  columnLines,
  describeOrmConsistency,
  dropStatements,
  inserts,
  itCountsOnlySmokeRowsInFinalCheck,
  itEndsEveryTransactionInRollback,
  loadMetadata,
  parseInsert,
  readOrmFile,
  recordQueries,
  smokeBlocks,
  statements,
} from "./support/ormConsistencyTestHelpers.js";

const POSTGRES_MAX_IDENTIFIER_LENGTH = 63;
const MIGRATION = "20261124_document";

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
];

const migrationSql = () => readOrmFile("migrations", `${MIGRATION}.sql`);

const ormFileLoader =
  (...parts) =>
  async () =>
    readOrmFile(...parts);

const migrationRecordLoader = (direction) => () => recordQueries((runner) => new Document20261124()[direction](runner));

const SOURCES = [
  [`${MIGRATION}.sql`, ormFileLoader("migrations", `${MIGRATION}.sql`)],
  ["schema.psql", ormFileLoader("schema.psql")],
  [`${MIGRATION}.js up()`, migrationRecordLoader("up")],
];

const DROP_SOURCES = [
  [`${MIGRATION}_rollback.sql`, ormFileLoader("migrations", `${MIGRATION}_rollback.sql`)],
  [`${MIGRATION}.js down()`, migrationRecordLoader("down")],
];

describeOrmConsistency({ tables: TABLES, schemas: SCHEMAS, sources: SOURCES, dropSources: DROP_SOURCES });

describe.each(SOURCES)("%s document columns", (_label, loadSql) => {
  it.each(SCHEMAS)("defaults status to active and visibility to internal in $schema", async ({ schema }) => {
    expect(columnLines(await loadSql(), `${schema}.document`)).toEqual(
      expect.arrayContaining([
        "status VARCHAR(20) NOT NULL DEFAULT 'active'",
        "visibility VARCHAR(20) NOT NULL DEFAULT 'internal'",
      ])
    );
  });

  it.each(SCHEMAS)("keeps document_version immutable, without updated_at, in $schema", async ({ schema }) => {
    expect(columnDefinitions(await loadSql(), `${schema}.document_version`)).not.toHaveProperty("updated_at");
  });
});

describe("Document entity", () => {
  it("defaults status to active and visibility to internal, as the table does", async () => {
    const metadata = await loadMetadata(Document);
    const defaults = ["status", "visibility"].map((column) => metadata.findColumnWithDatabaseName(column).default);
    expect(defaults).toEqual(["active", "internal"]);
  });
});

describe("index and constraint names", () => {
  const names = SCHEMAS.flatMap(({ suffix }) =>
    TABLES.flatMap(({ indexes, checks }) => [
      ...indexes.map((index) => `${index[1]}${suffix}`),
      ...checks.map((check) => `${check[0]}${suffix}`),
    ])
  );

  it("fit in a PostgreSQL identifier, so none is truncated", () => {
    expect(names.filter((name) => name.length > POSTGRES_MAX_IDENTIFIER_LENGTH)).toEqual([]);
  });

  it("are unique across both schemas", () => {
    expect(new Set(names).size).toBe(names.length);
  });
});

describe.each(DROP_SOURCES)("%s drop order", (_label, loadSql) => {
  it("drops every main object before the first test object", async () => {
    const schemaOrder = dropStatements(await loadSql()).map((qualifiedName) => qualifiedName.split(".")[0]);
    expect(schemaOrder.indexOf("test")).toBe(schemaOrder.lastIndexOf("main") + 1);
  });
});

describe("migration SQL smoke tests", () => {
  const smokeId = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const documentId = smokeId(1);

  const documentBlock = (schema) =>
    smokeBlocks(migrationSql()).find((block) => inserts(block).some((insert) => insert.table === `${schema}.document`));

  itEndsEveryTransactionInRollback(migrationSql);

  itCountsOnlySmokeRowsInFinalCheck(migrationSql, SCHEMAS.length * TABLES.length);

  it.each(SCHEMAS)("repeats version 1 only with ON CONFLICT DO NOTHING in $schema", ({ schema }) => {
    const versions = new Map(
      inserts(documentBlock(schema))
        .filter((insert) => insert.table === `${schema}.document_version`)
        .map((insert) => [insert.row.id, insert])
    );
    const shape = (n) => {
      const { row, onConflictDoNothing } = versions.get(smokeId(n));
      return [row.document_id, row.version_number, onConflictDoNothing];
    };
    expect([2, 3, 4].map(shape)).toEqual([
      [documentId, "1", false],
      [documentId, "2", false],
      [documentId, "1", true],
    ]);
  });

  it.each(SCHEMAS)("checks both defaults and the version count of the smoke document in $schema", ({ schema }) => {
    const queries = statements(documentBlock(schema)).filter((statement) => statement.startsWith("SELECT "));
    expect(queries).toEqual([
      `SELECT status AS default_status_should_be_active FROM ${schema}.document WHERE id = '${documentId}'`,
      `SELECT visibility AS default_visibility_should_be_internal FROM ${schema}.document WHERE id = '${documentId}'`,
      `SELECT count(*) AS versions_should_be_two FROM ${schema}.document_version WHERE document_id = '${documentId}'`,
    ]);
  });

  it.each(SCHEMAS)("tries each CHECK in its own rolled back block in $schema", ({ schema }) => {
    const rejectedRows = smokeBlocks(migrationSql())
      .map(statements)
      .filter((blockStatements) => blockStatements.length === 1)
      .map(([statement]) => parseInsert(statement))
      .filter((insert) => insert?.table === `${schema}.document_version`)
      .map(({ row }) => [row.version_number, row.file_size]);
    expect(rejectedRows).toEqual([
      ["0", "1024"],
      ["1", "0"],
    ]);
  });
});

describe("Tables registration", () => {
  it("registers document and document_version in the full entity list", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: Tables });
    await dataSource.buildMetadatas();
    expect(dataSource.entityMetadatas.map(({ tableName }) => tableName)).toEqual(
      expect.arrayContaining(TABLES.map(({ table }) => table))
    );
  });
});
