// Helpers shared by the entity-vs-schema tests in this folder. Deliberately not named *.test.js,
// so Jest does not collect it as a suite of its own.
import { readFileSync } from "node:fs";
import path from "node:path";

export const sorted = (values) => [...values].sort((left, right) => left.localeCompare(right));

export const loadSchemaSql = () => readFileSync(path.join(process.cwd(), "ORM", "schema.psql"), "utf8");

export const loadMigrationSql = (fileName) =>
  readFileSync(path.join(process.cwd(), "ORM", "migrations", fileName), "utf8");

// Returns the block between "CREATE TABLE IF NOT EXISTS <table> (" and the closing ");".
export const extractCreateTableBlock = (sql, qualifiedTable) => {
  const escapedTable = qualifiedTable.replaceAll(".", "\\.");
  const match = new RegExp(`CREATE TABLE IF NOT EXISTS ${escapedTable} \\(([\\s\\S]*?)\\n\\);`).exec(sql);
  if (!match) {
    throw new Error(`No CREATE TABLE block found for ${qualifiedTable}`);
  }
  return match[1];
};

export const extractCreateTableColumns = (sql, qualifiedTable) =>
  extractCreateTableBlock(sql, qualifiedTable)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("PRIMARY KEY"))
    .map((line) => line.split(/\s+/)[0].toLowerCase());

export const extractAddColumnNames = (sql, qualifiedTable) => {
  const escapedTable = qualifiedTable.replaceAll(".", "\\.");
  return [...sql.matchAll(new RegExp(`ALTER TABLE ${escapedTable} ADD COLUMN IF NOT EXISTS (\\w+)`, "g"))].map(
    (match) => match[1].toLowerCase()
  );
};
