import { expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";
import { Destination, Property_Destination } from "database/models/Destination";
import { DestinationTestSchema20261019 } from "../../ORM/migrations/20261019_destination_test_schema.js";

const read = (...parts) => readFileSync(path.join(process.cwd(), "ORM", ...parts), "utf8");
const MIGRATION = read("migrations", "20261007_destination.sql");
const OTHER_SOURCES = [read("migrations", "20261007_destination.js"), read("schema.psql")];
const TABLES = ["destination", "property_destination"];
const column = (name, type, nullable, pk) => `${name} ${type} ${nullable ? "null" : "not null"}${pk ? " pk" : ""}`;

const columnsIn = (sql, table) =>
  new RegExp(`CREATE TABLE IF NOT EXISTS main\\.${table} \\(([\\s\\S]*?)\\n\\s*\\);`)
    .exec(sql)[1]
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean)
    .map((line) => {
      const [name, type] = line.split(/\s+/);
      return column(name, type.toLowerCase(), !/NOT NULL|PRIMARY KEY/.test(line), /PRIMARY KEY/.test(line));
    })
    .sort();

const indexesIn = (sql) =>
  [...sql.matchAll(/CREATE (UNIQUE )?INDEX ASYNC (?:IF NOT EXISTS )?(\w+)\s+ON main\.(\w+) \(([^)]+)\);/g)]
    .filter(([, , , table]) => TABLES.includes(table))
    .map(([, unique, name, table, columns]) => `${name} ${table} (${columns})${unique ? " unique" : ""}`)
    .sort();

it("destination tables match the migration of #3466 in schema.psql, the migration script and the entity columns", async () => {
  const dataSource = new DataSource({ type: "postgres", entities: [Destination, Property_Destination] });
  await dataSource.buildMetadatas();
  const metadataOf = (table) => dataSource.entityMetadatas.find((metadata) => metadata.tableName === table);
  TABLES.forEach((table) => {
    const expected = columnsIn(MIGRATION, table);
    OTHER_SOURCES.forEach((sql) => expect(columnsIn(sql, table)).toEqual(expected));
    const mapped = metadataOf(table).columns.map((c) =>
      column(c.databaseName, c.length ? `${c.type}(${c.length})` : c.type, c.isNullable, c.isPrimary)
    );
    expect(mapped.sort()).toEqual(expected);
  });
  const expectedIndexes = indexesIn(MIGRATION);
  expect(expectedIndexes).toHaveLength(3);
  OTHER_SOURCES.forEach((sql) => expect(indexesIn(sql)).toEqual(expectedIndexes));
});

const statementsOf = async (method) => {
  const statements = [];
  await new DestinationTestSchema20261019()[method]({ query: async (statement) => statements.push(statement.trim()) });
  return statements;
};
const testSchemaAsMain = (sql) =>
  sql.slice(sql.indexOf("CREATE SCHEMA IF NOT EXISTS test;")).replaceAll("test.", "main.");
const normalize = (sql) => sql.replace(/\s+/g, " ").trim();

it("creates the same destination tables and _test indexes in the test schema, and only there", async () => {
  const up = (await statementsOf("up")).join("\n");
  const manual = read("migrations", "20261019_destination_test_schema.sql");
  const testIndexes = indexesIn(MIGRATION).map((index) => index.replace(/^(\w+) /, "$1_test "));
  [manual, up, read("schema.psql")].map(testSchemaAsMain).forEach((sql) => {
    TABLES.forEach((table) => expect(columnsIn(sql, table)).toEqual(columnsIn(MIGRATION, table)));
    expect(indexesIn(sql)).toEqual(testIndexes);
  });
  [manual, up].forEach((sql) => {
    expect(sql).not.toMatch(/\bmain\.(destination|property_destination)\b/);
    const creates = sql.match(/CREATE (UNIQUE )?\w+( ASYNC)?/g);
    expect(sql.match(/CREATE (UNIQUE )?\w+( ASYNC)? IF NOT EXISTS/g)).toEqual(creates.map((c) => `${c} IF NOT EXISTS`));
  });
});

it("rolls back only the test objects it created, and the rollback SQL does the same", async () => {
  const down = await statementsOf("down");
  expect(down).toEqual([
    "DROP INDEX IF EXISTS test.property_destination_destination_test;",
    "DROP INDEX IF EXISTS test.destination_parent_test;",
    "DROP INDEX IF EXISTS test.destination_path_unique_test;",
    "DROP TABLE IF EXISTS test.property_destination;",
    "DROP TABLE IF EXISTS test.destination;",
  ]);
  const rollback = read("migrations", "20261019_destination_test_schema_rollback.sql");
  expect(normalize(rollback)).toBe(normalize(down.join("\n")));
});
