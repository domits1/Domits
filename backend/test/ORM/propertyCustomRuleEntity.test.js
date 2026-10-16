import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { Property_CustomRule } from "database/models/Property_CustomRule";
import { extractCreateTableBlock, extractCreateTableColumns, loadMigrationSql, loadSchemaSql, sorted } from "./schemaSql";

const MIGRATION_FILE = "20261006_create_property_custom_rules.sql";

const CATALOG_COLUMNS = ["id", "property_id", "category", "rule_text", "enabled", "created_at"];

const COLUMN_TYPES = {
  id: "varchar",
  property_id: "varchar",
  category: "varchar",
  rule_text: "text",
  enabled: "boolean",
  created_at: "bigint",
};

const loadMetadata = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    username: "test",
    password: "test",
    database: "test",
    entities: [Property_CustomRule],
  });
  await dataSource.buildMetadatas();
  return dataSource.getMetadata(Property_CustomRule);
};

describe("Property_CustomRule entity", () => {
  it("maps exactly the columns of the property_custom_rules table", async () => {
    const metadata = await loadMetadata();
    expect(metadata.tableName).toBe("property_custom_rules");
    expect(sorted(metadata.columns.map((column) => column.databaseName))).toEqual(sorted(CATALOG_COLUMNS));
  });

  it("uses id as the only primary column", async () => {
    const metadata = await loadMetadata();
    expect(metadata.primaryColumns.map((column) => column.databaseName)).toEqual(["id"]);
  });

  it("declares every column NOT NULL, as the table does", async () => {
    const metadata = await loadMetadata();
    expect(metadata.columns.filter((column) => column.isNullable)).toEqual([]);
  });

  it("maps each column to the type the table uses", async () => {
    const metadata = await loadMetadata();
    const types = Object.fromEntries(metadata.columns.map((column) => [column.databaseName, column.type]));
    expect(types).toEqual(COLUMN_TYPES);
  });

  it("defaults enabled to true", async () => {
    const metadata = await loadMetadata();
    expect(metadata.findColumnWithDatabaseName("enabled").default).toBe(true);
  });
});

describe.each([
  ["schema.psql", loadSchemaSql],
  [MIGRATION_FILE, () => loadMigrationSql(MIGRATION_FILE)],
])("%s property_custom_rules blocks", (_label, loadSql) => {
  it.each(["main", "test"])("declares the same columns as the entity for %s.property_custom_rules", async (schema) => {
    const metadata = await loadMetadata();
    const entityColumns = metadata.columns.map((column) => column.databaseName);
    expect(sorted(extractCreateTableColumns(loadSql(), `${schema}.property_custom_rules`))).toEqual(
      sorted(entityColumns)
    );
  });

  it.each(["main", "test"])("declares the property_id index for %s with CREATE INDEX ASYNC", (schema) => {
    const suffix = schema === "test" ? "_test" : "";
    expect(loadSql()).toMatch(
      new RegExp(
        String.raw`CREATE INDEX ASYNC (IF NOT EXISTS )?property_custom_rules_property_id_idx${suffix}\s+ON ${schema}\.property_custom_rules \(property_id\);`
      )
    );
  });

  // Aurora DSQL has no foreign keys, and a column constraint cannot be altered later.
  it.each(["main", "test"])("declares no foreign key or CHECK constraint for %s", (schema) => {
    expect(extractCreateTableBlock(loadSql(), `${schema}.property_custom_rules`)).not.toMatch(
      /FOREIGN KEY|REFERENCES|CHECK\s*\(/i
    );
  });
});
