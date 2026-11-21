import SchemaGuard, { REQUIRED_SCHEMA } from "../business/schemaGuard.js";

const readyRows = () => [
  ...Object.entries(REQUIRED_SCHEMA.columns).flatMap(([table, columns]) =>
    columns.map((column) => ({ kind: "column", object_name: table, member_name: column }))
  ),
  ...REQUIRED_SCHEMA.indexes.map((index) => ({
    kind: "index",
    object_name: "ignored",
    member_name: index,
  })),
];

describe("AutomatedMessaging schema guard", () => {
  test("accepts the complete required schema", async () => {
    const guard = new SchemaGuard({ inspect: jest.fn(async () => readyRows()) });

    await expect(guard.assertReady()).resolves.toEqual({ ready: true });
  });

  test("reports missing migration state clearly without changing the schema", async () => {
    const rows = readyRows().filter((row) => row.member_name !== "automationdeliveryid");
    const inspect = jest.fn(async () => rows);
    const guard = new SchemaGuard({ inspect });

    await expect(guard.assertReady()).rejects.toMatchObject({
      statusCode: 503,
      code: "SCHEMA_NOT_READY",
      details: { missingColumns: ["unified_message.automationdeliveryid"] },
    });
    expect(inspect).toHaveBeenCalledTimes(1);
  });

  test.each(["offsetdirection", "sendtime"])("requires the stay-date column %s of message_automation", async (column) => {
    const rows = readyRows().filter((row) => !(row.object_name === "message_automation" && row.member_name === column));
    const guard = new SchemaGuard({ inspect: jest.fn(async () => rows) });

    await expect(guard.assertReady()).rejects.toMatchObject({
      statusCode: 503,
      code: "SCHEMA_NOT_READY",
      details: { missingColumns: [`message_automation.${column}`] },
    });
  });
});
