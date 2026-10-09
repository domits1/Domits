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
  });
});
