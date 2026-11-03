import { afterEach, describe, expect, it, jest } from "@jest/globals";
import RemoteLockCredentialStore from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockCredentialStore.js";

const IDS = { userId: "user-1", integrationAccountId: "account-1" };
const TOKENS = { accessToken: "a", refreshToken: "r", tokenType: "Bearer", expiresAt: 1, refreshIssuedAt: 2 };
const originalPrefix = process.env.REMOTELOCK_SECRET_PREFIX;

afterEach(() => {
  if (originalPrefix === undefined) delete process.env.REMOTELOCK_SECRET_PREFIX;
  else process.env.REMOTELOCK_SECRET_PREFIX = originalPrefix;
});

describe("RemoteLockCredentialStore", () => {
  it("names secrets domits/remotelock/<userId>/<integrationAccountId>", () => {
    delete process.env.REMOTELOCK_SECRET_PREFIX;

    const store = new RemoteLockCredentialStore({ secrets: { send: jest.fn() } });

    expect(store.buildSecretName(IDS)).toBe("domits/remotelock/user-1/account-1");
  });

  it("reads the prefix from REMOTELOCK_SECRET_PREFIX when the store is built", () => {
    process.env.REMOTELOCK_SECRET_PREFIX = "custom/prefix";

    const store = new RemoteLockCredentialStore({ secrets: { send: jest.fn() } });

    expect(store.buildSecretName(IDS)).toBe("custom/prefix/user-1/account-1");
  });

  it("creates the secret when it does not exist, and reads the token payload back", async () => {
    const missing = Object.assign(new Error("not found"), { name: "ResourceNotFoundException" });
    const send = jest
      .fn()
      .mockRejectedValueOnce(missing)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ SecretString: JSON.stringify(TOKENS) });
    const store = new RemoteLockCredentialStore({ secrets: { send } });

    const name = await store.ensureSecret({ ...IDS, payload: TOKENS });

    expect(name).toBe("domits/remotelock/user-1/account-1");
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual([
      "DescribeSecretCommand",
      "CreateSecretCommand",
    ]);
    expect(send.mock.calls[1][0].input).toEqual({ Name: name, SecretString: JSON.stringify(TOKENS) });
    await expect(store.readSecret(name)).resolves.toEqual(TOKENS);
  });

  it("updates the secret when it already exists", async () => {
    const send = jest.fn().mockResolvedValue({});
    const store = new RemoteLockCredentialStore({ secrets: { send } });

    await store.ensureSecret({ ...IDS, payload: TOKENS });

    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual([
      "DescribeSecretCommand",
      "PutSecretValueCommand",
    ]);
    const [[describe], [put]] = send.mock.calls;
    expect(describe.input).toEqual({ SecretId: "domits/remotelock/user-1/account-1" });
    expect(put.input).toEqual({ SecretId: "domits/remotelock/user-1/account-1", SecretString: JSON.stringify(TOKENS) });
  });

  describe("secret names", () => {
    const store = () => {
      delete process.env.REMOTELOCK_SECRET_PREFIX;
      return new RemoteLockCredentialStore({ secrets: { send: jest.fn() } });
    };

    it.each([
      ["userId", { ...IDS, userId: "user/1" }],
      ["userId", { ...IDS, userId: "/" }],
      ["userId", { ...IDS, userId: "" }],
      ["userId", { ...IDS, userId: "   " }],
      ["userId", { ...IDS, userId: " user-1 " }],
      ["userId", { ...IDS, userId: "us er" }],
      ["userId", { ...IDS, userId: "user:1" }],
      ["userId", { ...IDS, userId: "user\n1" }],
      ["userId", { ...IDS, userId: "üser" }],
      ["userId", { ...IDS, userId: undefined }],
      ["userId", { ...IDS, userId: 7 }],
      ["integrationAccountId", { ...IDS, integrationAccountId: "other-user/account-1" }],
      ["integrationAccountId", { ...IDS, integrationAccountId: "" }],
      ["integrationAccountId", { ...IDS, integrationAccountId: " " }],
      ["integrationAccountId", { ...IDS, integrationAccountId: "account 1" }],
      ["integrationAccountId", { ...IDS, integrationAccountId: null }],
    ])("refuses a bad %s with a plain error that does not contain the value", (label, ids) => {
      const error = (() => {
        try {
          return store().buildSecretName(ids);
        } catch (caught) {
          return caught;
        }
      })();

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain(label);
      expect(error.message).not.toContain("other-user");
      expect(error.message).not.toContain("user/1");
      expect(error.message).not.toContain("us er");
      expect(error.message).not.toContain("account 1");
    });

    it("refuses before any secret is touched", async () => {
      const send = jest.fn();
      const guarded = new RemoteLockCredentialStore({ secrets: { send } });

      await expect(guarded.ensureSecret({ userId: "a/b", integrationAccountId: "c", payload: TOKENS })).rejects.toThrow(
        "userId"
      );
      expect(send).not.toHaveBeenCalled();
    });

    it("accepts every character that AWS allows in a name, except the slash", () => {
      expect(store().buildSecretName({ userId: "aZ09_+=.@-", integrationAccountId: "account-1" })).toBe(
        "domits/remotelock/aZ09_+=.@-/account-1"
      );
    });
  });
});
