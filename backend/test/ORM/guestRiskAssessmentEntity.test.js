import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { GuestRiskAssessment } from "database/models/unified/integrations/GuestRiskAssessment";
import { readFileSync } from "node:fs";
import path from "node:path";

const sorted = (values) => [...values].sort((left, right) => left.localeCompare(right));

const loadSchemaSql = () => readFileSync(path.join(process.cwd(), "ORM", "schema.psql"), "utf8");

const loadMigrationSql = (fileName) => readFileSync(path.join(process.cwd(), "ORM", "migrations", fileName), "utf8");

const extractCreateTableBlock = (sql, qualifiedTable) => {
  const escapedTable = qualifiedTable.replaceAll(".", String.raw`\.`);
  const match = new RegExp(String.raw`CREATE TABLE IF NOT EXISTS ${escapedTable} \(([\s\S]*?)\n\);`).exec(sql);
  if (!match) {
    throw new Error(`No CREATE TABLE block found for ${qualifiedTable}`);
  }
  return match[1];
};

const extractCreateTableColumns = (sql, qualifiedTable) =>
  extractCreateTableBlock(sql, qualifiedTable)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("PRIMARY KEY"))
    .map((line) => line.split(/\s+/)[0].toLowerCase());

const MIGRATION_FILE = "20261012_create_guest_risk_assessment.sql";

const CATALOG_COLUMNS = [
  "id",
  "provider",
  "bookingid",
  "providerassessmentid",
  "status",
  "flaggedreason",
  "errormessage",
  "arrivaldate",
  "departuredate",
  "createdat",
  "updatedat",
];

const NULLABLE_COLUMNS = ["providerassessmentid", "flaggedreason", "errormessage", "arrivaldate", "departuredate"];

const loadMetadata = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    username: "test",
    password: "test",
    database: "test",
    entities: [GuestRiskAssessment],
  });
  await dataSource.buildMetadatas();
  return dataSource.getMetadata(GuestRiskAssessment);
};

describe("GuestRiskAssessment entity", () => {
  it("maps exactly the columns of the guest_risk_assessment table", async () => {
    const metadata = await loadMetadata();
    expect(metadata.tableName).toBe("guest_risk_assessment");
    expect(sorted(metadata.columns.map((column) => column.databaseName))).toEqual(sorted(CATALOG_COLUMNS));
  });

  it("uses id as the only primary column", async () => {
    const metadata = await loadMetadata();
    expect(metadata.primaryColumns.map((column) => column.databaseName)).toEqual(["id"]);
  });

  it("allows null only where the table does", async () => {
    const metadata = await loadMetadata();
    const nullable = metadata.columns.filter((column) => column.isNullable).map((column) => column.databaseName);
    expect(sorted(nullable)).toEqual(sorted(NULLABLE_COLUMNS));
  });
});

describe.each([
  ["schema.psql", loadSchemaSql],
  [MIGRATION_FILE, () => loadMigrationSql(MIGRATION_FILE)],
])("%s guest_risk_assessment blocks", (_label, loadSql) => {
  it.each(["main", "test"])("declares the same columns as the entity for %s.guest_risk_assessment", async (schema) => {
    const metadata = await loadMetadata();
    const entityColumns = metadata.columns.map((column) => column.databaseName);
    expect(sorted(extractCreateTableColumns(loadSql(), `${schema}.guest_risk_assessment`))).toEqual(sorted(entityColumns));
  });

  it.each(["main", "test"])("declares the bookingid index for %s with CREATE INDEX ASYNC", (schema) => {
    const suffix = schema === "test" ? "_test" : "";
    expect(loadSql()).toMatch(
      new RegExp(
        String.raw`CREATE INDEX ASYNC (IF NOT EXISTS )?guest_risk_assessment_bookingid_idx${suffix}\s+ON ${schema}\.guest_risk_assessment \(bookingid\);`
      )
    );
  });

  it.each(["main", "test"])("declares no foreign key or CHECK constraint for %s", (schema) => {
    expect(extractCreateTableBlock(loadSql(), `${schema}.guest_risk_assessment`)).not.toMatch(
      /FOREIGN KEY|REFERENCES|CHECK\s*\(/i
    );
  });
});