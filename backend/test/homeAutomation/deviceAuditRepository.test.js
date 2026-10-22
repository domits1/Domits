import { describe, expect, it, jest } from "@jest/globals";
import { AUDIT_ACTION } from "../../functions/.shared/homeAutomation/homeAutomationConstants.js";
import DeviceAuditRepository, {
  MAX_AUDIT_PAGE,
} from "../../functions/.shared/homeAutomation/repositories/deviceAuditRepository.js";

const NOW = 1_800_000_000_000;
const ACCOUNT = "account-1";
const BASE = { integrationAccountId: ACCOUNT, userId: "host-1", providerDeviceId: "device-1" };

const repository = (extra = {}) => new DeviceAuditRepository({ now: () => NOW, randomId: () => "audit-1", ...extra });
const managerWith = (query = jest.fn().mockResolvedValue([])) => ({
  query,
  connection: { options: { schema: "test" } },
});

describe("DeviceAuditRepository surface", () => {
  // Append-only is a convention the schema cannot enforce, so the class has to offer nothing that changes a row.
  it("exposes exactly constructor, insert and listByAccount", () => {
    expect(Object.getOwnPropertyNames(DeviceAuditRepository.prototype).sort()).toEqual([
      "constructor",
      "insert",
      "listByAccount",
    ]);
    expect(Object.keys(repository())).toEqual([]);
  });

  it("issues no UPDATE or DELETE from any of its methods", async () => {
    const manager = managerWith();
    const client = { options: { schema: "test" }, query: jest.fn().mockResolvedValue([]) };
    const audit = repository({ getClient: async () => client });

    await audit.insert(manager, { ...BASE, action: AUDIT_ACTION.MAPPED, newPropertyId: "p-1" });
    await audit.listByAccount(ACCOUNT);

    const statements = [...manager.query.mock.calls, ...client.query.mock.calls].map(([sql]) => sql);
    expect(statements).toHaveLength(2);
    statements.forEach((sql) => expect(sql).not.toMatch(/\b(UPDATE|DELETE|TRUNCATE|DROP)\b/i));
  });
});

describe("DeviceAuditRepository.insert", () => {
  it.each([
    [AUDIT_ACTION.MAPPED, { newPropertyId: "p-2" }, [null, "p-2"]],
    [AUDIT_ACTION.REMAPPED, { oldPropertyId: "p-1", newPropertyId: "p-2" }, ["p-1", "p-2"]],
    [AUDIT_ACTION.UNMAPPED, { oldPropertyId: "p-1" }, ["p-1", null]],
  ])("writes a %s row with ids only, through the given manager", async (action, ids, [oldId, newId]) => {
    const manager = managerWith();

    const entry = await repository().insert(manager, { ...BASE, action, ...ids });

    expect(manager.query).toHaveBeenCalledTimes(1);
    const [sql, params] = manager.query.mock.calls[0];
    expect(sql).toContain("INSERT INTO test.home_automation_device_audit");
    expect(params).toEqual(["audit-1", ACCOUNT, "host-1", "device-1", action, oldId, newId, NOW]);
    expect(entry).toMatchObject({ id: "audit-1", action, oldPropertyId: oldId, newPropertyId: newId, createdAt: NOW });
  });

  it.each([
    ["an unknown action", { action: "RENAMED", newPropertyId: "p-2" }],
    ["a lower-case action", { action: "mapped", newPropertyId: "p-2" }],
    ["a missing action", { newPropertyId: "p-2" }],
    ["a MAPPED row with an old property", { action: "MAPPED", oldPropertyId: "p-1", newPropertyId: "p-2" }],
    ["a MAPPED row without a new property", { action: "MAPPED" }],
    ["a REMAPPED row without an old property", { action: "REMAPPED", newPropertyId: "p-2" }],
    ["a REMAPPED row without a new property", { action: "REMAPPED", oldPropertyId: "p-1" }],
    ["a REMAPPED row that keeps the property", { action: "REMAPPED", oldPropertyId: "p-1", newPropertyId: "p-1" }],
    ["an UNMAPPED row without an old property", { action: "UNMAPPED" }],
    ["an UNMAPPED row with a new property", { action: "UNMAPPED", oldPropertyId: "p-1", newPropertyId: "p-2" }],
    ["a blank user id", { action: "MAPPED", newPropertyId: "p-2", userId: " " }],
    ["a missing account id", { action: "MAPPED", newPropertyId: "p-2", integrationAccountId: undefined }],
  ])("rejects %s before writing", async (_label, row) => {
    const manager = managerWith();

    await expect(repository().insert(manager, { ...BASE, ...row })).rejects.toThrow(Error);

    expect(manager.query).not.toHaveBeenCalled();
  });

  // The message is asserted because a missing check would otherwise still throw, a TypeError on the shape lookup.
  it.each([
    ["an unknown action", "RENAMED"],
    ["a lower-case action", "mapped"],
    ["a missing action", undefined],
    ["an inherited property name", "constructor"],
  ])("rejects %s with the action message", async (_label, action) => {
    const manager = managerWith();

    await expect(repository().insert(manager, { ...BASE, action, newPropertyId: "p-2" })).rejects.toThrow(
      "action must be MAPPED, REMAPPED or UNMAPPED."
    );

    expect(manager.query).not.toHaveBeenCalled();
  });

  it.each([undefined, null, {}, { query: "not a function" }])(
    "requires a transaction manager (%j)",
    async (manager) => {
      await expect(repository().insert(manager, { ...BASE, action: "MAPPED", newPropertyId: "p-2" })).rejects.toThrow(
        "transaction manager"
      );
    }
  );

  it("carries no field that could hold a name or a token", async () => {
    const entry = await repository().insert(managerWith(), {
      ...BASE,
      action: AUDIT_ACTION.MAPPED,
      newPropertyId: "p-2",
      name: "Front door",
      token: "secret",
    });

    expect(Object.keys(entry).sort()).toEqual(
      [
        "action",
        "createdAt",
        "id",
        "integrationAccountId",
        "newPropertyId",
        "oldPropertyId",
        "providerDeviceId",
        "userId",
      ].sort()
    );
  });
});

describe("DeviceAuditRepository.listByAccount", () => {
  const rowsFrom = (query) => ({ options: { schema: "test" }, query });

  it("reads one account newest first and maps the columns", async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: "a-1",
        integration_account_id: ACCOUNT,
        user_id: "host-1",
        provider_device_id: "device-1",
        action: "REMAPPED",
        old_property_id: "p-1",
        new_property_id: "p-2",
        created_at: "1800000000000",
      },
    ]);

    const rows = await repository({ getClient: async () => rowsFrom(query) }).listByAccount(ACCOUNT, { limit: 10 });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("FROM test.home_automation_device_audit");
    expect(sql).toMatch(/WHERE integration_account_id = \$1\s+ORDER BY created_at DESC\s+LIMIT \$2/);
    expect(params).toEqual([ACCOUNT, 10]);
    expect(rows).toEqual([
      {
        id: "a-1",
        integrationAccountId: ACCOUNT,
        userId: "host-1",
        providerDeviceId: "device-1",
        action: "REMAPPED",
        oldPropertyId: "p-1",
        newPropertyId: "p-2",
        createdAt: 1_800_000_000_000,
      },
    ]);
  });

  it("defaults to a page of 50", async () => {
    const query = jest.fn().mockResolvedValue([]);

    await repository({ getClient: async () => rowsFrom(query) }).listByAccount(ACCOUNT);

    expect(query.mock.calls[0][1]).toEqual([ACCOUNT, 50]);
  });

  it.each([
    ["a blank account id", [" ", { limit: 5 }]],
    ["limit 0", [ACCOUNT, { limit: 0 }]],
    ["a fractional limit", [ACCOUNT, { limit: 1.5 }]],
    ["a limit above the cap", [ACCOUNT, { limit: MAX_AUDIT_PAGE + 1 }]],
  ])("rejects %s before any query", async (_label, args) => {
    const getClient = jest.fn();

    await expect(repository({ getClient }).listByAccount(...args)).rejects.toThrow(Error);

    expect(getClient).not.toHaveBeenCalled();
  });
});
