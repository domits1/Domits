import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { Booking } from "database/models/Booking";
import { extractAddColumnNames, extractCreateTableColumns, loadMigrationSql, loadSchemaSql, sorted } from "./schemaSql";

const CATALOG_COLUMNS = [
  "id",
  "arrivaldate",
  "departuredate",
  "createdat",
  "guestid",
  "guests",
  "hostid",
  "latepayment",
  "paymentid",
  "property_id",
  "status",
  "guestname",
  "hostname",
  "cancellation_policy",
  "bookingtype",
  "refunded_amount",
  "stripe_refund_id",
  "refund_error",
  "total_price",
  "booking_source",
  "site_id",
  "guest_email",
  "public_booking_ref",
  "idempotency_key",
  "checked_out_at",
  "special_request",
  "cancelled_at",
];

const CATALOG_NOT_NULL_COLUMNS = [
  "id",
  "arrivaldate",
  "departuredate",
  "createdat",
  "guestid",
  "guests",
  "hostid",
  "latepayment",
  "paymentid",
  "property_id",
  "status",
  "guestname",
  "hostname",
];

const DIRECT_BOOKING_WEBSITE_COLUMNS = ["booking_source", "site_id", "guest_email", "public_booking_ref", "idempotency_key"];

const loadBookingMetadata = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    username: "test",
    password: "test",
    database: "test",
    entities: [Booking],
  });
  await dataSource.buildMetadatas();
  return dataSource.getMetadata(Booking);
};

describe("Booking entity", () => {
  it("maps exactly the columns present on the booking table", async () => {
    const metadata = await loadBookingMetadata();
    expect(metadata.tableName).toBe("booking");
    expect(sorted(metadata.columns.map((column) => column.databaseName))).toEqual(sorted(CATALOG_COLUMNS));
  });

  it("uses id as the only primary column", async () => {
    const metadata = await loadBookingMetadata();
    expect(metadata.primaryColumns.map((column) => column.databaseName)).toEqual(["id"]);
  });

  it("declares NOT NULL only where the table does", async () => {
    const metadata = await loadBookingMetadata();
    const notNullColumns = metadata.columns.filter((column) => !column.isNullable).map((column) => column.databaseName);
    expect(sorted(notNullColumns)).toEqual(sorted(CATALOG_NOT_NULL_COLUMNS));
  });

  it("maps the direct booking website columns as nullable varchar with no default", async () => {
    const metadata = await loadBookingMetadata();
    DIRECT_BOOKING_WEBSITE_COLUMNS.forEach((columnName) => {
      const column = metadata.findColumnWithDatabaseName(columnName);
      expect(column).toBeDefined();
      expect(column.type).toBe("varchar");
      expect(column.isNullable).toBe(true);
      expect(column.default).toBeUndefined();
    });
  });

  it("reads cancelled_at as a number and keeps an empty one empty", async () => {
    const metadata = await loadBookingMetadata();
    const { transformer } = metadata.findColumnWithDatabaseName("cancelled_at");
    expect(transformer.from("1792281600000")).toBe(1792281600000);
    expect(transformer.from(null)).toBeNull();
  });

  it.todo("declares no column defaults that the booking table does not have (total_price, refunded_amount, bookingtype)");
});

describe("cancelled_at migration", () => {
  it("adds the column to both schemas, because the entity selects it on every booking read", () => {
    const sql = loadMigrationSql("20261030_booking_cancelled_at.sql");
    expect(sql).toContain("ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;");
    expect(sql).toContain("ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;");
  });
});

describe("schema.psql booking blocks", () => {
  it("declares the same columns as the entity for main.booking", async () => {
    const metadata = await loadBookingMetadata();
    const entityColumns = metadata.columns.map((column) => column.databaseName);
    expect(sorted(extractCreateTableColumns(loadSchemaSql(), "main.booking"))).toEqual(sorted(entityColumns));
  });

  it("declares the same columns as the entity for test.booking, including appended ALTERs", async () => {
    const metadata = await loadBookingMetadata();
    const entityColumns = metadata.columns.map((column) => column.databaseName);
    const sql = loadSchemaSql();
    const testColumns = [...extractCreateTableColumns(sql, "test.booking"), ...extractAddColumnNames(sql, "test.booking")];
    expect(sorted(testColumns)).toEqual(sorted(entityColumns));
  });

  it("declares the unique indexes on public_booking_ref and idempotency_key for both schemas", () => {
    const sql = loadSchemaSql();
    expect(sql).toMatch(/CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique ON main\.booking \(public_booking_ref\);/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique ON main\.booking \(idempotency_key\);/);
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique_test ON test\.booking \(public_booking_ref\);/
    );
    expect(sql).toMatch(/CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique_test ON test\.booking \(idempotency_key\);/);
  });
});
