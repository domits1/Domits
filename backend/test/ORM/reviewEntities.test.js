import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { DataSource } from "typeorm";
import { Review } from "../../ORM/models/Review.js";
import { Review_Rating } from "../../ORM/models/Review_Rating.js";
import { Review_Category } from "../../ORM/models/Review_Category.js";
import { Review_Request } from "../../ORM/models/Review_Request.js";
import { Tables } from "../../ORM/util/database/Tables.js";
import { CreateReviews20260930 } from "../../ORM/migrations/20260930_create_reviews.js";

const entities = [Review, Review_Rating, Review_Category, Review_Request];
const sql = readFileSync("ORM/migrations/20260930_create_reviews.sql", "utf8");
const normalize = (value) => value.replace(/\s+/g, " ").trim();

// Independent expectations ensure removing a default or transformer fails.
const expectedDefaults = {
  review: { verification_status: "UNVERIFIED", publication_status: "UNPUBLISHED", status: "DRAFT" },
  review_rating: {},
  review_category: { is_active: true, sort_order: 0 },
  review_request: { status: "OPEN" },
};

const expectedTransformers = {
  review: ["overall_rating", "created_at", "updated_at"],
  review_rating: ["rating", "created_at"],
  review_category: ["created_at", "updated_at"],
  review_request: [
    "requested_at", "expires_at", "completed_at", "created_at", "updated_at",
    "last_sent_at", "next_send_at", "claimed_at",
  ],
};

describe.each(entities.map((entity) => [entity.options.tableName, entity]))(
  "%s persistence mapping",
  (table, entity) => {
    it("is registered and matches the migration columns in both schemas", async () => {
      expect(Tables).toContain(entity);
      const source = new DataSource({ type: "postgres", entities: [entity] });
      await source.buildMetadatas();
      const metadata = source.getMetadata(entity);
      // The Domits feedback column is installed by the later 20261027 migration.
      const initialColumns = metadata.columns.filter(column => column.databaseName !== "domits_private_feedback");
      expect(metadata.primaryColumns.map((column) => column.databaseName)).toEqual(["id"]);

      for (const schema of ["test", "main"]) {
        const block = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${schema}\\.${table} \\(([\\s\\S]*?)\\n\\);`))[1];
        const definitions = block.trim().split(/\n/).map((line) => line.trim().replace(/,$/, ""));
        expect(definitions.map((line) => line.split(" ")[0]).sort()).toEqual(
          initialColumns.map((column) => column.databaseName).sort()
        );
        for (const column of initialColumns) {
          const definition = definitions.find((line) => line.startsWith(`${column.databaseName} `));
          const type = column.type === "int" ? "INTEGER" : column.type.toUpperCase();
          const parameters = column.length ? `(${column.length})` :
            column.precision !== undefined ? `(${column.precision}, ${column.scale})` : "";
          expect(definition).toContain(`${column.databaseName} ${type}${parameters} `);
          expect(definition.includes("NOT NULL")).toBe(!column.isNullable);
          expect(definition.includes("PRIMARY KEY")).toBe(column.isPrimary);
          const expected = expectedDefaults[table][column.databaseName];
          expect(column.default).toBe(expected);
          if (expected !== undefined) {
            const value = typeof expected === "string" ? `'${expected}'` : String(expected);
            expect(definition).toContain(`DEFAULT ${value}`);
          } else {
            expect(definition).not.toContain("DEFAULT ");
          }
        }
      }
    });

    it("converts PostgreSQL numeric strings and preserves nullable values", () => {
      const columns = Object.fromEntries(
        Object.entries(entity.options.columns).map(([property, column]) => [column.name ?? property, column])
      );
      for (const name of expectedTransformers[table]) {
        expect(columns[name]).toBeDefined();
        const transformer = columns[name].transformer;
        expect(transformer).toBeDefined();
        expect(typeof transformer.from).toBe("function");
        expect(typeof transformer.to).toBe("function");
        const value = ["overall_rating", "rating"].includes(name) ? "4.5" : "1792368000000";
        expect(transformer.from(value)).toBe(Number(value));
        expect(transformer.from("0")).toBe(0);
        expect(transformer.from(null)).toBeNull();
        expect(transformer.from(undefined)).toBeNull();
        expect(transformer.to(Number(value))).toBe(Number(value));
        expect(transformer.to(0)).toBe(0);
        expect(transformer.to(null)).toBeNull();
      }
    });
  }
);

describe("review migration", () => {
  it("keeps the hand-run SQL synchronized with up", async () => {
    const statements = [];
    await new CreateReviews20260930().up({ query: async (statement) => statements.push(statement) });
    expect(normalize(statements.join("\n"))).toBe(normalize(sql));
    expect(sql).toContain("IF NOT EXISTS review_request_booking_type_guest_unique_main");
    expect(sql).not.toMatch(/IF NOT EXISTS review_request_booking_type_guest_unique\s/);
  });

  it("issues no queries during rollback, preserving pre-existing objects", async () => {
    const statements = [];
    await new CreateReviews20260930().down({ query: async (statement) => statements.push(statement) });
    expect(statements).toEqual([]);
    const rollback = readFileSync("ORM/migrations/20260930_create_reviews_rollback.sql", "utf8");
    const executable = rollback.replace(/--[^\n]*/g, "");
    expect(normalize(executable)).toBe("SELECT 1 AS review_rollback_preserves_data;");
  });
});
