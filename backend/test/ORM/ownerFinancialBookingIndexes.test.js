import { describe, expect, it } from "@jest/globals";
import { OwnerFinancialBookingIndexes20261125 } from "../../ORM/migrations/20261125_owner_financial_booking_indexes.js";

describe("Owner financial booking indexes", () => {
  it("adds the created-time and stay-overlap indexes to both booking schemas", async () => {
    const statements = [];
    await new OwnerFinancialBookingIndexes20261125().up({
      query: async (sql) => statements.push(sql),
    });

    expect(statements).toHaveLength(4);
    expect(statements[0]).toContain("booking_owner_financial_created_idx_test");
    expect(statements[0]).toContain("ON test.booking (hostid, property_id, createdat, id)");
    expect(statements[1]).toContain("booking_owner_financial_stay_idx_test");
    expect(statements[1]).toContain("ON test.booking (hostid, property_id, arrivaldate) INCLUDE (departuredate)");
    expect(statements[2]).toContain("booking_owner_financial_created_idx");
    expect(statements[2]).toContain("ON main.booking (hostid, property_id, createdat, id)");
    expect(statements[3]).toContain("booking_owner_financial_stay_idx");
    expect(statements[3]).toContain("ON main.booking (hostid, property_id, arrivaldate) INCLUDE (departuredate)");
  });

  it("rolls back only the four indexes introduced by this migration", async () => {
    const statements = [];
    await new OwnerFinancialBookingIndexes20261125().down({
      query: async (sql) => statements.push(sql),
    });

    expect(statements).toEqual([
      "DROP INDEX IF EXISTS main.booking_owner_financial_stay_idx;",
      "DROP INDEX IF EXISTS main.booking_owner_financial_created_idx;",
      "DROP INDEX IF EXISTS test.booking_owner_financial_stay_idx_test;",
      "DROP INDEX IF EXISTS test.booking_owner_financial_created_idx_test;",
    ]);
  });
});
