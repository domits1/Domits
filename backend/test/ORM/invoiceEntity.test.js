import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { Invoice } from "../../ORM/models/Invoice.js";
import { InvoiceMoneyFields20261124 } from "../../ORM/migrations/20261124_invoice_money_fields.js";

const buildMetadata = async () => {
  const source = new DataSource({ type: "postgres", entities: [Invoice] });
  await source.buildMetadatas();
  return source.getMetadata(Invoice);
};

describe("Invoice money persistence", () => {
  it("stores currency and exact integer minor-unit snapshots as nullable fields", async () => {
    const metadata = await buildMetadata();
    expect(metadata.findColumnWithDatabaseName("currency")).toMatchObject({
      type: "varchar",
      length: "3",
      isNullable: true,
    });

    for (const name of [
      "rate_per_night_minor",
      "gross_amount_minor",
      "commission_amount_minor",
      "net_amount_minor",
    ]) {
      const column = metadata.findColumnWithDatabaseName(name);
      expect(column).toBeDefined();
      expect(column.type).toBe("bigint");
      expect(column.isNullable).toBe(true);
      expect(column.transformer.from("1200")).toBe("1200");
      expect(column.transformer.from(null)).toBeNull();
    }
  });

  it("keeps the compatibility decimal columns at numeric(10,2)", async () => {
    const metadata = await buildMetadata();
    for (const name of ["rate_per_night", "gross_amount", "commission_amount", "net_amount"]) {
      expect(metadata.findColumnWithDatabaseName(name)).toMatchObject({
        type: "numeric",
        precision: 10,
        scale: 2,
        isNullable: false,
      });
    }
  });

  it("adds each money field to the existing main.invoice table", async () => {
    const statements = [];
    await new InvoiceMoneyFields20261124().up({ query: async (sql) => statements.push(sql) });
    expect(statements).toHaveLength(5);
    expect(statements.every((sql) => sql.includes("ALTER TABLE main.invoice"))).toBe(true);
    expect(statements.join("\n")).toContain("currency VARCHAR(3)");
    expect(statements.join("\n")).toContain("gross_amount_minor BIGINT");
  });
});
