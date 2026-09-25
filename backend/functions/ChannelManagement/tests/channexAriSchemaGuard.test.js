import ChannexAriSchemaGuard, {
  REQUIRED_CHANNEX_ARI_SCHEMA,
} from "../../.shared/channelManagement/services/channexAriSchemaGuard.js";

const columnRows = () =>
  REQUIRED_CHANNEX_ARI_SCHEMA.columns.channex_ari_outbox.map((column) => ({
    kind: "column",
    object_name: "channex_ari_outbox",
    member_name: column,
  }));

const indexRows = () =>
  REQUIRED_CHANNEX_ARI_SCHEMA.indexes.map((index) => ({
    kind: "index",
    object_name: "channex_ari_outbox",
    member_name: index,
  }));

const guardWith = (rows) => new ChannexAriSchemaGuard({ inspect: async () => rows });

describe("ChannexAriSchemaGuard", () => {
  test("passes when every column and index is present", async () => {
    await expect(guardWith([...columnRows(), ...indexRows()]).assertReady()).resolves.toEqual({ ready: true });
  });

  test("names the missing column when the migration was not applied fully", async () => {
    const rows = [...columnRows().slice(0, -1), ...indexRows()];

    await expect(guardWith(rows).assertReady()).rejects.toMatchObject({
      code: "CHANNEX_ARI_SCHEMA_NOT_READY",
      details: { missingColumns: ["channex_ari_outbox.processedat"], missingIndexes: [] },
    });
  });

  test("names the missing index when an async build never finished", async () => {
    const rows = [...columnRows(), ...indexRows().slice(0, 1)];

    await expect(guardWith(rows).assertReady()).rejects.toMatchObject({
      details: { missingColumns: [], missingIndexes: ["idx_channex_ari_outbox_stale"] },
    });
  });

  test("refuses when the table does not exist at all", async () => {
    await expect(guardWith([]).assertReady()).rejects.toMatchObject({
      message: expect.stringContaining("Channex ARI outbox schema is not ready"),
    });
  });

  test("ignores columns of other tables that happen to share a name", async () => {
    const rows = [
      ...columnRows(),
      ...indexRows(),
      { kind: "column", object_name: "booking_automation_outbox", member_name: "status" },
    ];

    await expect(guardWith(rows).assertReady()).resolves.toEqual({ ready: true });
  });

  test("survives a repository that returns nothing usable", async () => {
    await expect(guardWith(null).assertReady()).rejects.toMatchObject({
      code: "CHANNEX_ARI_SCHEMA_NOT_READY",
    });
  });
});
