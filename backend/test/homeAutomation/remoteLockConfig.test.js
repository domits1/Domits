import { describe, expect, it, jest } from "@jest/globals";
import {
  RemoteLockConfigError,
  createRemoteLockOAuthClientLoader,
} from "../../functions/.shared/homeAutomation/remoteLockConfig.js";

const ENV = {
  REMOTELOCK_CLIENT_ID: "client-id-1",
  REMOTELOCK_REDIRECT_URI: "https://app.example.test/remotelock/callback",
  REMOTELOCK_CLIENT_SECRET_NAME: "domits/remotelock/app",
};
const CLIENT_SECRET = "client-secret-zzz";

const build = ({ env = ENV, secretString = JSON.stringify({ clientSecret: CLIENT_SECRET }) } = {}) => {
  let clock = 0;
  const secrets = { send: jest.fn(async () => ({ SecretString: secretString })) };
  const load = createRemoteLockOAuthClientLoader({ env, secrets, now: () => clock });
  return { load, secrets, advance: (ms) => (clock += ms) };
};

describe("createRemoteLockOAuthClientLoader", () => {
  it("builds a client whose authorize URL carries the configured client id, redirect URI and the state", async () => {
    const { load } = build();

    const url = new URL((await load()).buildAuthorizeUrl("some-state"));

    expect(url.searchParams.get("client_id")).toBe("client-id-1");
    expect(url.searchParams.get("redirect_uri")).toBe(ENV.REMOTELOCK_REDIRECT_URI);
    expect(url.searchParams.get("state")).toBe("some-state");
  });

  it.each(Object.keys(ENV))("throws RemoteLockConfigError when %s is missing", async (name) => {
    const { load, secrets } = build({ env: { ...ENV, [name]: "" } });

    await expect(load()).rejects.toBeInstanceOf(RemoteLockConfigError);
    expect(secrets.send).not.toHaveBeenCalled();
  });

  it.each([
    ["a secret that is not JSON", "not json"],
    ["a secret without a client secret", JSON.stringify({ other: 1 })],
  ])("throws a fixed RemoteLockConfigError for %s, without quoting it", async (_label, secretString) => {
    const { load } = build({ secretString });

    const error = await load().catch((caught) => caught);

    expect(error).toBeInstanceOf(RemoteLockConfigError);
    expect(error.message).not.toContain(secretString);
  });

  it("reads the client secret once within the cache window and again after it", async () => {
    const { load, secrets, advance } = build();

    await load();
    advance(5 * 60 * 1000 - 1);
    await load();
    expect(secrets.send).toHaveBeenCalledTimes(1);

    advance(1);
    await load();
    expect(secrets.send).toHaveBeenCalledTimes(2);
  });
});
