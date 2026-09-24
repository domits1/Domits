import { ChannexAriOutbox } from "database/models/channelManagement/ChannexAriOutbox";
import { Tables } from "../../../ORM/util/database/Tables.js";

describe("ChannexAriOutbox entity", () => {
  test("maps camelCase properties to the lowercase database columns", () => {
    const { tableName, columns } = ChannexAriOutbox.options;

    expect(tableName).toBe("channex_ari_outbox");
    expect(columns.domitsPropertyId.name).toBe("domitspropertyid");
    expect(columns.changeTypes.name).toBe("changetypes");
    expect(columns.dateFrom.name).toBe("datefrom");
    expect(columns.dateTo.name).toBe("dateto");
    expect(columns.attemptCount.name).toBe("attemptcount");
    expect(columns.nextAttemptAt.name).toBe("nextattemptat");
    expect(columns.failureReason.name).toBe("failurereason");
    expect(columns.sentSummary.name).toBe("sentsummary");
    expect(columns.createdAt.name).toBe("createdat");
    expect(columns.updatedAt.name).toBe("updatedat");
    expect(columns.processedAt.name).toBe("processedat");
  });

  test("reads bigint timestamps back as numbers", () => {
    const { columns } = ChannexAriOutbox.options;

    expect(columns.createdAt.type).toBe("bigint");
    expect(columns.createdAt.transformer.from("1750000000000")).toBe(1750000000000);
    expect(columns.nextAttemptAt.transformer.from(null)).toBeNull();
  });

  test("is registered with TypeORM, otherwise every query fails with missing metadata", () => {
    expect(Tables).toContain(ChannexAriOutbox);
  });

  test("holds every column the migration creates, and no others", () => {
    const { columns } = ChannexAriOutbox.options;
    const databaseColumns = Object.entries(columns)
      .map(([property, definition]) => definition.name || property.toLowerCase())
      .sort();

    expect(databaseColumns).toEqual([
      "attemptcount",
      "changetypes",
      "createdat",
      "datefrom",
      "dateto",
      "domitspropertyid",
      "failurereason",
      "id",
      "kind",
      "nextattemptat",
      "processedat",
      "sentsummary",
      "source",
      "status",
      "updatedat",
    ]);
  });
});
