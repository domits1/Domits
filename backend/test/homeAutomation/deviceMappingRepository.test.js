import { describe, expect, it, jest } from "@jest/globals";
import {
  ACCESS_CREDENTIAL_STATUS,
  TERMINAL_ACCESS_CREDENTIAL_STATUSES,
} from "../../functions/.shared/homeAutomation/homeAutomationConstants.js";
import DeviceAuditRepository from "../../functions/.shared/homeAutomation/repositories/deviceAuditRepository.js";
import DeviceMappingRepository, {
  MAPPING_OUTCOME,
} from "../../functions/.shared/homeAutomation/repositories/deviceMappingRepository.js";

const NOW = 1_800_000_000_000;
const ACCOUNT = "account-1";
const USER = "host-1";
const DEVICE_ID = "device-1";
const ROW_ID = "row-1";
const DEVICE = {
  deviceType: "lock",
  name: "Front door",
  status: "ONLINE",
  batteryLevel: 82,
  lastSeenAt: 1_799_999_000_000,
};
const SAVE = {
  integrationAccountId: ACCOUNT,
  userId: USER,
  providerDeviceId: DEVICE_ID,
  propertyId: "p-2",
  device: DEVICE,
};
const REMOVE = { integrationAccountId: ACCOUNT, userId: USER, providerDeviceId: DEVICE_ID };
const LIVE_CREDENTIAL = [{ "?column?": 1 }];

const uniqueViolation = () => Object.assign(new Error("duplicate key"), { code: "23505" });
const conflict = () => Object.assign(new Error("change conflicts"), { code: "40001" });

const kind = (sql) => {
  if (/^\s*SELECT 1 FROM/.test(sql)) return "credential";
  if (/^\s*SELECT/.test(sql)) return "read";
  if (/INSERT INTO test\.home_automation_device_audit/.test(sql)) return "audit";
  if (/INSERT INTO test\.home_automation_device\b/.test(sql)) return "insert";
  if (/^\s*UPDATE test\.home_automation_device\b/.test(sql)) return "update";
  if (/^\s*DELETE FROM test\.home_automation_device\b/.test(sql)) return "delete";
  return "other";
};

// A fake DataSource. Statements run inside transaction() count as "committed" only when the work resolves, so a
// test can see whether the row change and its audit row stand or fall together. client.query is the autocommit path.
// failOn throws on every statement of a kind, failOnce on the first one only.
const setup = ({ reads = [], credentials = [], failOn = {}, failOnce = {} } = {}) => {
  const committed = [];
  const readQueue = [...reads];
  const once = { ...failOnce };
  const client = { options: { schema: "test" }, query: jest.fn().mockResolvedValue([]) };
  client.transaction = jest.fn(async (work) => {
    const statements = [];
    const manager = {
      connection: { options: { schema: "test" } },
      query: jest.fn(async (sql, params) => {
        const type = kind(sql);
        statements.push({ type, sql, params });
        if (once[type]) {
          const error = once[type];
          delete once[type];
          throw error;
        }
        if (failOn[type]) throw failOn[type];
        if (type === "read") return readQueue.shift() ?? [];
        return type === "credential" ? credentials : [];
      }),
    };
    const result = await work(manager);
    committed.push(...statements);
    return result;
  });
  const getClient = async () => client;
  const repository = new DeviceMappingRepository({
    getClient,
    auditRepository: new DeviceAuditRepository({ getClient, now: () => NOW, randomId: () => "audit-1" }),
    now: () => NOW,
    randomId: () => ROW_ID,
    retryOptions: { wait: async () => {}, jitterMs: () => 0 },
  });
  return { repository, client, committed };
};

const row = (propertyId = "p-1") => [
  { id: ROW_ID, integration_account_id: ACCOUNT, provider_device_id: DEVICE_ID, property_id: propertyId },
];
const typesOf = (statements) => statements.map((statement) => statement.type);
const auditOf = (statements) => statements.find((statement) => statement.type === "audit").params;

describe("DeviceMappingRepository arguments", () => {
  // Every call is rejected before the database is touched.
  it.each([
    ["find with a blank account id", (r) => r.find(" ", DEVICE_ID)],
    ["find with a missing device id", (r) => r.find(ACCOUNT, undefined)],
    ["saveMapping with a blank user id", (r) => r.saveMapping({ ...SAVE, userId: "" })],
    ["saveMapping with a missing property id", (r) => r.saveMapping({ ...SAVE, propertyId: undefined })],
    [
      "saveMapping with a device without a type",
      (r) => r.saveMapping({ ...SAVE, device: { ...DEVICE, deviceType: "" } }),
    ],
    ["saveMapping without a device", (r) => r.saveMapping({ ...SAVE, device: undefined })],
    ["removeMapping with a blank device id", (r) => r.removeMapping({ ...REMOVE, providerDeviceId: " " })],
    ["hasLiveCredential with a blank device id", (r) => r.hasLiveCredential(" ")],
  ])("rejects %s", async (_label, call) => {
    const { repository, client } = setup();

    await expect(call(repository)).rejects.toThrow(Error);

    expect(client.query).not.toHaveBeenCalled();
    expect(client.transaction).not.toHaveBeenCalled();
  });
});

describe("DeviceMappingRepository.find", () => {
  it("returns the mapping of a device on the account, and null for an unmapped one", async () => {
    const { repository, client } = setup();
    client.query.mockResolvedValueOnce(row());

    await expect(repository.find(ACCOUNT, DEVICE_ID)).resolves.toEqual({
      id: ROW_ID,
      integrationAccountId: ACCOUNT,
      providerDeviceId: DEVICE_ID,
      propertyId: "p-1",
    });
    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toMatch(
      /FROM test\.home_automation_device\s+WHERE integration_account_id = \$1 AND provider_device_id = \$2/
    );
    expect(params).toEqual([ACCOUNT, DEVICE_ID]);
    await expect(repository.find(ACCOUNT, DEVICE_ID)).resolves.toBeNull();
  });
});

describe("DeviceMappingRepository.saveMapping", () => {
  it("creates the row and its MAPPED audit row in one transaction", async () => {
    const { repository, client, committed } = setup({ reads: [[]] });

    await expect(repository.saveMapping(SAVE)).resolves.toEqual({ outcome: MAPPING_OUTCOME.MAPPED, propertyId: "p-2" });

    expect(typesOf(committed)).toEqual(["read", "insert", "audit"]);
    expect(committed[1].params).toEqual([
      ROW_ID,
      ACCOUNT,
      DEVICE_ID,
      "p-2",
      "lock",
      "Front door",
      "ONLINE",
      82,
      1_799_999_000_000,
      NOW,
    ]);
    expect(auditOf(committed)).toEqual(["audit-1", ACCOUNT, USER, DEVICE_ID, "MAPPED", null, "p-2", NOW]);
    expect(client.query).not.toHaveBeenCalled();
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });

  it("moves the device and audits REMAPPED, after checking for live credentials in the same transaction", async () => {
    const { repository, client, committed } = setup({ reads: [row("p-1")] });

    await expect(repository.saveMapping(SAVE)).resolves.toEqual({
      outcome: MAPPING_OUTCOME.REMAPPED,
      propertyId: "p-2",
    });

    expect(typesOf(committed)).toEqual(["read", "credential", "update", "audit"]);
    expect(committed[1].params[0]).toBe(ROW_ID);
    expect(committed[2].params).toEqual([ROW_ID, "p-2", "lock", "Front door", "ONLINE", 82, 1_799_999_000_000, NOW]);
    expect(auditOf(committed)).toEqual(["audit-1", ACCOUNT, USER, DEVICE_ID, "REMAPPED", "p-1", "p-2", NOW]);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("writes nothing and audits nothing while a live credential holds the device at its property", async () => {
    const { repository, committed } = setup({ reads: [row("p-1")], credentials: LIVE_CREDENTIAL });

    await expect(repository.saveMapping(SAVE)).resolves.toEqual({ outcome: MAPPING_OUTCOME.IN_USE });

    expect(typesOf(committed)).toEqual(["read", "credential"]);
  });

  it("answers UNCHANGED without writing or looking at credentials when the property stays", async () => {
    const { repository, committed } = setup({ reads: [row("p-2")], credentials: LIVE_CREDENTIAL });

    await expect(repository.saveMapping(SAVE)).resolves.toEqual({
      outcome: MAPPING_OUTCOME.UNCHANGED,
      propertyId: "p-2",
    });

    expect(typesOf(committed)).toEqual(["read"]);
  });

  it("stores nothing when either the audit insert or the row write fails", async () => {
    const audit = setup({ reads: [[]], failOn: { audit: new Error("audit down") } });
    await expect(audit.repository.saveMapping(SAVE)).rejects.toThrow("audit down");
    expect(audit.committed).toEqual([]);
    expect(audit.client.query).not.toHaveBeenCalled();

    const write = setup({ reads: [[]], failOn: { insert: new Error("insert down") } });
    await expect(write.repository.saveMapping(SAVE)).rejects.toThrow("insert down");
    expect(write.committed).toEqual([]);
    expect(write.client.query).not.toHaveBeenCalled();
  });

  it("runs the whole transaction again after a 40001, and commits once", async () => {
    const { repository, committed, client } = setup({ reads: [[], []], failOnce: { insert: conflict() } });

    await expect(repository.saveMapping(SAVE)).resolves.toMatchObject({ outcome: MAPPING_OUTCOME.MAPPED });

    expect(client.transaction).toHaveBeenCalledTimes(2);
    expect(typesOf(committed)).toEqual(["read", "insert", "audit"]);
  });

  describe("when a first-time save loses the race on the unique index (23505)", () => {
    it.each([
      ["another property", "p-1", MAPPING_OUTCOME.REMAPPED, ["read", "credential", "update", "audit"]],
      ["the same property", "p-2", MAPPING_OUTCOME.UNCHANGED, ["read"]],
    ])("reads again and decides from the other writer's row (%s)", async (_label, propertyId, outcome, types) => {
      const { repository, committed, client } = setup({
        reads: [[], row(propertyId)],
        failOnce: { insert: uniqueViolation() },
      });

      await expect(repository.saveMapping(SAVE)).resolves.toMatchObject({ outcome });

      expect(client.transaction).toHaveBeenCalledTimes(2);
      expect(typesOf(committed)).toEqual(types);
    });

    it("gives up after one more try", async () => {
      const { repository, client } = setup({ reads: [[], []], failOn: { insert: uniqueViolation() } });

      await expect(repository.saveMapping(SAVE)).rejects.toMatchObject({ code: "23505" });

      expect(client.transaction).toHaveBeenCalledTimes(2);
    });
  });

  it("does not retry an error that is neither a conflict nor a unique violation", async () => {
    const { repository, client } = setup({ reads: [[]], failOn: { insert: new Error("connection lost") } });

    await expect(repository.saveMapping(SAVE)).rejects.toThrow("connection lost");

    expect(client.transaction).toHaveBeenCalledTimes(1);
  });

  it("stores nulls for the optional device fields, and never anything else the caller passes", async () => {
    const { repository, committed } = setup({ reads: [[]] });

    await repository.saveMapping({
      ...SAVE,
      device: {
        deviceType: "lock",
        status: "UNKNOWN",
        name: 5,
        batteryLevel: 1.5,
        lastSeenAt: "yesterday",
        token: "secret",
      },
    });

    expect(committed[1].params).toEqual([ROW_ID, ACCOUNT, DEVICE_ID, "p-2", "lock", null, "UNKNOWN", null, null, NOW]);
  });
});

describe("DeviceMappingRepository.removeMapping", () => {
  it("deletes the row and audits UNMAPPED in one transaction, checking credentials against the row id", async () => {
    const { repository, committed, client } = setup({ reads: [row("p-1")] });

    await expect(repository.removeMapping(REMOVE)).resolves.toEqual({
      outcome: MAPPING_OUTCOME.UNMAPPED,
      propertyId: "p-1",
    });

    expect(typesOf(committed)).toEqual(["read", "credential", "delete", "audit"]);
    expect(committed[1].params[0]).toBe(ROW_ID);
    expect(committed[2].params).toEqual([ROW_ID]);
    expect(auditOf(committed)).toEqual(["audit-1", ACCOUNT, USER, DEVICE_ID, "UNMAPPED", "p-1", null, NOW]);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("reports NOT_MAPPED and writes nothing for a device that is not mapped, however often it is called", async () => {
    const { repository, committed } = setup({ reads: [[], []] });

    await expect(repository.removeMapping(REMOVE)).resolves.toEqual({ outcome: MAPPING_OUTCOME.NOT_MAPPED });
    await expect(repository.removeMapping(REMOVE)).resolves.toEqual({ outcome: MAPPING_OUTCOME.NOT_MAPPED });

    expect(typesOf(committed)).toEqual(["read", "read"]);
  });

  it("reports IN_USE and deletes nothing while a credential is live", async () => {
    const { repository, committed } = setup({ reads: [row()], credentials: LIVE_CREDENTIAL });

    await expect(repository.removeMapping(REMOVE)).resolves.toEqual({ outcome: MAPPING_OUTCOME.IN_USE });

    expect(typesOf(committed)).toEqual(["read", "credential"]);
  });

  it("keeps the row when the audit insert fails", async () => {
    const { repository, committed } = setup({ reads: [row()], failOn: { audit: new Error("audit down") } });

    await expect(repository.removeMapping(REMOVE)).rejects.toThrow("audit down");

    expect(committed).toEqual([]);
  });
});

describe("DeviceMappingRepository.hasLiveCredential", () => {
  const LIVE = [
    ACCESS_CREDENTIAL_STATUS.PENDING,
    ACCESS_CREDENTIAL_STATUS.CREATED,
    ACCESS_CREDENTIAL_STATUS.SCHEDULED,
    ACCESS_CREDENTIAL_STATUS.ACTIVE,
    ACCESS_CREDENTIAL_STATUS.FAILED,
  ];

  // FAILED stays live: a failed issue may have left a guest at RemoteLock.
  it("treats only EXPIRED, REVOKED and CANCELLED as terminal", () => {
    expect([...TERMINAL_ACCESS_CREDENTIAL_STATUSES].sort()).toEqual(["CANCELLED", "EXPIRED", "REVOKED"]);
  });

  it("asks for credentials of the device whose status is not terminal, and reads the answer from the rows", async () => {
    const { repository, client } = setup();
    client.query.mockResolvedValueOnce(LIVE_CREDENTIAL);

    await expect(repository.hasLiveCredential(ROW_ID)).resolves.toBe(true);
    await expect(repository.hasLiveCredential(ROW_ID)).resolves.toBe(false);

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toMatch(/FROM test\.access_credential\s+WHERE device_id = \$1 AND status NOT IN \(\$2, \$3, \$4\)/);
    expect(params).toEqual([ROW_ID, "EXPIRED", "REVOKED", "CANCELLED"]);
    LIVE.forEach((status) => expect(params).not.toContain(status));
  });

  it("uses the given transaction manager instead of the client", async () => {
    const { repository, client } = setup();
    const manager = {
      connection: { options: { schema: "test" } },
      query: jest.fn().mockResolvedValue(LIVE_CREDENTIAL),
    };

    await expect(repository.hasLiveCredential(ROW_ID, manager)).resolves.toBe(true);

    expect(manager.query).toHaveBeenCalledTimes(1);
    expect(client.query).not.toHaveBeenCalled();
  });
});
