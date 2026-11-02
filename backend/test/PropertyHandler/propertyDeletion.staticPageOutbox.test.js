import { describe, it, expect, jest } from "@jest/globals";
import Database from "database";
import { PropertyDeletionRepository } from "../../functions/PropertyHandler/data/repository/propertyDeletionRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const COLUMNS = {
  standalone_site: ["id", "property_id"],
  standalone_site_domain: ["id", "site_id"],
  static_page_outbox: ["site_id", "revision", "status"],
  property: ["id"],
};

const runDeletion = async ({ siteIds = ["site-1"] } = {}) => {
  const deletes = [];
  const query = jest.fn(async (statement, parameters = []) => {
    const sql = statement.replace(/\s+/g, " ").trim();
    if (sql.startsWith("SELECT to_regclass")) {
      return [{ table_name: parameters[0].includes(".") ? null : parameters[0] }];
    }
    if (sql.includes("information_schema.columns")) {
      const [table, ...candidates] = parameters;
      return (COLUMNS[table] || ["property_id"])
        .filter((column) => candidates.includes(column))
        .map((column) => ({ column_name: column }));
    }
    if (sql.startsWith('SELECT "id" AS id FROM "standalone_site" WHERE "property_id"')) {
      return siteIds.map((id) => ({ id }));
    }
    if (sql.startsWith("SELECT 1 AS exists_flag")) {
      return [{ exists_flag: 1 }];
    }
    if (sql.startsWith("DELETE FROM")) {
      deletes.push([sql.split(" ")[2], parameters[0]]);
    }
    return [];
  });
  Database.getInstance.mockResolvedValue({ transaction: async (work) => work({ query }) });
  await new PropertyDeletionRepository().deletePropertyById("property-1");
  return deletes;
};

describe("deleting a listing removes the static page outbox rows of its websites", () => {
  it("deletes the outbox rows of the listing's sites in the same transaction, before the site rows", async () => {
    const deletes = await runDeletion();
    const tables = deletes.map(([table]) => table);

    expect(deletes).toContainEqual(['"static_page_outbox"', ["site-1"]]);
    expect(tables.indexOf('"static_page_outbox"')).toBeLessThan(tables.indexOf('"standalone_site"'));
  });

  it("leaves the outbox alone when the listing has no website", async () => {
    const deletes = await runDeletion({ siteIds: [] });

    expect(deletes.map(([table]) => table)).not.toContain('"static_page_outbox"');
    expect(deletes.map(([table]) => table)).toContain('"property"');
  });
});
