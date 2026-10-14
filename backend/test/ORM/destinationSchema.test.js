import { expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";
import { Destination, Property_Destination } from "database/models/Destination";

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
