// Helpers shared by the home automation entity-vs-migration tests. Deliberately not named *.test.js,
// so Jest does not collect it as a suite of its own.
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";

const SQL_TYPES = { varchar: "varchar", text: "text", integer: "int", bigint: "bigint" };

export const loadMetadata = async (entity) => {
  const dataSource = new DataSource({ type: "postgres", entities: [entity] });
  await dataSource.buildMetadatas();
  return dataSource.getMetadata(entity);
};

// Normalised, because a Windows checkout may have converted the files to CRLF.
export const loadMigrationSql = (fileName) =>
  readFileSync(path.join(process.cwd(), "ORM", "migrations", fileName), "utf8").replaceAll("\r\n", "\n");

export const createTableBlock = (sql, qualifiedTable) => {
  const match = new RegExp(
    String.raw`CREATE TABLE IF NOT EXISTS ${qualifiedTable.replace(".", String.raw`\.`)} \(([\s\S]*?)\n\);`
  ).exec(sql);
  if (!match) throw new Error(`No CREATE TABLE block found for ${qualifiedTable}`);
  return match[1];
};

export const sqlColumns = (sql, qualifiedTable) =>
  createTableBlock(sql, qualifiedTable)
    .split("\n")
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);

export const sqlColumnDefinitions = (sql, qualifiedTable) =>
  Object.fromEntries(
    createTableBlock(sql, qualifiedTable)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, typeToken] = line.split(/\s+/);
        const [, typeName, length] = /^(\w+)(?:\((\d+)\))?/.exec(typeToken);
        const nullable = /\bNOT NULL\b/i.test(line) ? false : /\bNULL\b/i.test(line);
        return [name, [SQL_TYPES[typeName.toLowerCase()], nullable, length ? Number(length) : null]];
      })
  );

export const smokeBlocks = (sql) => [...sql.matchAll(/BEGIN;([\s\S]*?)ROLLBACK;/g)].map((match) => match[1]);
