import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";

const SQL_TYPES = { uuid: "uuid", varchar: "varchar", text: "text", bigint: "bigint", integer: "int" };

const compareAsDefaultSort = (left, right) => {
  const leftText = String(left);
  const rightText = String(right);
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
};

export const readOrmFile = (...parts) =>
  readFileSync(path.join(process.cwd(), "ORM", ...parts), "utf8").replaceAll("\r\n", "\n");

export const recordQueries = async (run) => {
  const queries = [];
  await run({ query: async (sql) => queries.push(sql) });
  return queries.join("\n");
};

export const loadMetadata = async (entity) => {
  const dataSource = new DataSource({ type: "postgres", entities: [entity] });
  await dataSource.buildMetadatas();
  return dataSource.getMetadata(entity);
};

export const createTableBlockIndentAware = (sql, qualifiedTable) => {
  const escapedTable = qualifiedTable.replace(".", String.raw`\.`);
  const match = new RegExp(String.raw`CREATE TABLE IF NOT EXISTS ${escapedTable} \(([\s\S]*?)\n\s*\);`).exec(sql);
  if (!match) throw new Error(`No CREATE TABLE block found for ${qualifiedTable}`);
  return match[1];
};

export const isConstraintLine = (line) => /^CONSTRAINT\b/i.test(line);

export const blockLines = (sql, qualifiedTable) =>
  createTableBlockIndentAware(sql, qualifiedTable)
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean);

export const columnLines = (sql, qualifiedTable) =>
  blockLines(sql, qualifiedTable).filter((line) => !isConstraintLine(line));

export const columnDefinitions = (sql, qualifiedTable) =>
  Object.fromEntries(
    columnLines(sql, qualifiedTable).map((line) => {
      const [name, typeToken] = line.split(/\s+/);
      const [, typeName, length] = /^(\w+)(?:\((\d+)\))?$/.exec(typeToken);
      const nullable = !/\bNOT NULL\b|\bPRIMARY KEY\b/i.test(line);
      return [name, [SQL_TYPES[typeName.toLowerCase()], nullable, length ? Number(length) : null]];
    })
  );

export const checkConstraints = (sql, qualifiedTable) =>
  blockLines(sql, qualifiedTable)
    .filter(isConstraintLine)
    .map((line) => {
      const match = /^CONSTRAINT (\w+) CHECK \((.+)\)$/i.exec(line);
      if (!match) throw new Error(`Unexpected constraint in ${qualifiedTable}: ${line}`);
      return [match[1], match[2]];
    })
    .sort(compareAsDefaultSort);

export const expectedChecks = (checks, suffix) =>
  checks.map(([name, expression]) => [`${name}${suffix}`, expression]).sort(compareAsDefaultSort);

export const normalizePredicate = (predicate = "") => predicate.replaceAll(/\s+/g, " ").trim();

export const indexesOn = (sql, qualifiedTable) =>
  [
    ...sql.matchAll(
      /CREATE (UNIQUE )?INDEX ASYNC (?:IF NOT EXISTS )?(\w+)\s+ON (\w+\.\w+) \(([^)]+)\)(?:\s+WHERE ([^;]+)|\s*);/g
    ),
  ]
    .filter((match) => match[3] === qualifiedTable)
    .map(([, unique = "", name, , keyColumns, predicate]) => [unique, name, keyColumns, normalizePredicate(predicate)])
    .sort(compareAsDefaultSort);

export const expectedIndexes = (indexes, suffix) =>
  indexes
    .map(([unique, name, keyColumns, predicate]) => [unique, `${name}${suffix}`, keyColumns, predicate])
    .sort(compareAsDefaultSort);

export const dropStatements = (sql) =>
  [...sql.matchAll(/DROP (INDEX|TABLE) IF EXISTS (\w+\.\w+);/g)].map((match) => match[2]);

export const smokeBlocks = (sql) => [...sql.matchAll(/BEGIN;([\s\S]*?)ROLLBACK;/g)].map((match) => match[1]);

export const statements = (block) =>
  block
    .split(";")
    .map((statement) => statement.replaceAll(/\s+/g, " ").trim())
    .filter(Boolean);

export const parseInsert = (statement) => {
  const match = /^INSERT INTO (\w+\.\w+) \(([^)]*)\) VALUES \((.*?)\)( ON CONFLICT DO NOTHING)?$/.exec(statement);
  if (!match) return null;
  const [, table, columnList, valueList, onConflict] = match;
  const values = valueList.split(/,\s*/).map((value) => (value === "NULL" ? null : value.replaceAll(/^'|'$/g, "")));
  const row = Object.fromEntries(columnList.split(/,\s*/).map((column, index) => [column, values[index]]));
  return { table, row, onConflictDoNothing: Boolean(onConflict) };
};

export const inserts = (block) => statements(block).map(parseInsert).filter(Boolean);

export const itEndsEveryTransactionInRollback = (loadMigrationSql) =>
  it("ends every transaction in ROLLBACK and never commits", () => {
    const sql = loadMigrationSql();
    expect(sql).not.toMatch(/\bCOMMIT\b/i);
    expect(sql.match(/^BEGIN;$/gm)).toHaveLength(sql.match(/^ROLLBACK;$/gm).length);
    expect(smokeBlocks(sql).every((block) => !/\bBEGIN;/.test(block))).toBe(true);
  });

export const itCountsOnlySmokeRowsInFinalCheck = (loadMigrationSql, expectedCount) =>
  it("counts only the smoke rows in the final check, and lists every id the smoke tests insert", () => {
    const sql = loadMigrationSql();
    const finalCheck = sql.slice(sql.lastIndexOf("ROLLBACK;"));
    const insertedIds = smokeBlocks(sql).flatMap((block) =>
      [...block.matchAll(/INSERT INTO \w+\.\w+ \([^)]*\)\s*VALUES \('([^']+)'/g)].map((match) => match[1])
    );

    expect(finalCheck.match(/count\(\*\)/g)).toHaveLength(expectedCount);
    expect(finalCheck.match(/WHERE id IN \(SELECT id FROM smoke_ids\)/g)).toHaveLength(expectedCount);
    expect(insertedIds.length).toBeGreaterThan(0);
    new Set(insertedIds).forEach((id) => expect(finalCheck).toContain(`('${id}'::uuid)`));
  });

const describeEntityMappings = (tables) =>
  describe.each(tables)("$table entity", ({ table, entity, columns }) => {
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

const describeCreateSources = (tables, schemas, sources) =>
  describe.each(sources)("%s", (_label, loadSql) => {
    describe.each(tables)("$table", ({ table, columns, indexes, checks }) => {
      it.each(schemas)("declares the entity columns for $schema", async ({ schema }) => {
        expect(columnDefinitions(await loadSql(), `${schema}.${table}`)).toEqual(columns);
      });

      it.each(schemas)(
        "declares exactly the expected indexes with CREATE INDEX ASYNC for $schema",
        async ({ schema, suffix }) => {
          expect(indexesOn(await loadSql(), `${schema}.${table}`)).toEqual(expectedIndexes(indexes, suffix));
        }
      );

      it.each(schemas)("generates the id in the database for $schema", async ({ schema }) => {
        expect(columnLines(await loadSql(), `${schema}.${table}`)).toContain(
          "id UUID DEFAULT gen_random_uuid() PRIMARY KEY"
        );
      });

      it.each(schemas)("declares no foreign key for $schema", async ({ schema }) => {
        expect(createTableBlockIndentAware(await loadSql(), `${schema}.${table}`)).not.toMatch(
          /FOREIGN KEY|REFERENCES/i
        );
      });

      it.each(schemas)(
        "declares exactly the expected named CHECK constraints for $schema",
        async ({ schema, suffix }) => {
          const sql = await loadSql();
          const block = createTableBlockIndentAware(sql, `${schema}.${table}`);
          expect(checkConstraints(sql, `${schema}.${table}`)).toEqual(expectedChecks(checks, suffix));
          expect(block.match(/CHECK\s*\(/gi) ?? []).toHaveLength(checks.length);
        }
      );

      it.each(schemas)("adds no constraint after the CREATE TABLE for $schema", async ({ schema }) => {
        expect(await loadSql()).not.toMatch(
          new RegExp(String.raw`ALTER TABLE (IF EXISTS )?${schema}\.${table}\s`, "i")
        );
      });
    });
  });

const describeDropSources = (tables, schemas, dropSources) =>
  describe.each(dropSources)("%s", (_label, loadSql) => {
    const expectedDrops = schemas.flatMap(({ schema, suffix }) =>
      tables.flatMap(({ table, indexes }) => [
        ...indexes.map(([, name]) => `${schema}.${name}${suffix}`),
        `${schema}.${table}`,
      ])
    );

    it("drops every index and table the migration creates, in both schemas", async () => {
      expect(dropStatements(await loadSql()).sort(compareAsDefaultSort)).toEqual(
        [...expectedDrops].sort(compareAsDefaultSort)
      );
    });

    it("drops each index before the table it belongs to", async () => {
      const drops = dropStatements(await loadSql());
      schemas.forEach(({ schema, suffix }) =>
        tables.forEach(({ table, indexes }) =>
          indexes.forEach(([, name]) =>
            expect(drops.indexOf(`${schema}.${name}${suffix}`)).toBeLessThan(drops.indexOf(`${schema}.${table}`))
          )
        )
      );
    });
  });

export const describeOrmConsistency = ({ tables, schemas, sources, dropSources }) => {
  describeEntityMappings(tables);
  describeCreateSources(tables, schemas, sources);
  describeDropSources(tables, schemas, dropSources);
};
