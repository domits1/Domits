import { describe, expect, jest, test } from "@jest/globals";
import { readSiteMinderConfig } from "../../functions/SiteMinder-Integration/util/siteMinderConfig.js";
import { SiteMinderSecretRepository } from "../../functions/SiteMinder-Integration/data/siteMinderSecretRepository.js";

describe("readSiteMinderConfig", () => {
  test("reads the PMS code and defaults to EUR and the standard secret name", () => {
    expect(readSiteMinderConfig({ SITEMINDER_PMS_CODE: " PMSXTEST " })).toEqual({
      pmsCode: "PMSXTEST",
      currency: "EUR",
      baseUrl: undefined,
      secretName: "domits/siteminder/pmsxchange",
    });
  });

  test("takes a currency, base URL and secret name from the environment", () => {
    const config = readSiteMinderConfig({ SITEMINDER_PMS_CODE: "X", SITEMINDER_CURRENCY: "usd", SITEMINDER_BASE_URL: "https://x", SITEMINDER_SECRET_NAME: "s" });

    expect(config).toEqual({ pmsCode: "X", currency: "USD", baseUrl: "https://x", secretName: "s" });
  });

  test("refuses a missing PMS code or a bad currency", () => {
    expect(() => readSiteMinderConfig({})).toThrow("SITEMINDER_PMS_CODE is required");
    expect(() => readSiteMinderConfig({ SITEMINDER_PMS_CODE: "X", SITEMINDER_CURRENCY: "EURO" })).toThrow("3-letter code");
  });
});

const clientReturning = (secretString) => ({ send: jest.fn(async () => ({ SecretString: secretString })) });

describe("SiteMinderSecretRepository", () => {
  test("reads the username and password once", async () => {
    const client = clientReturning('{"username":"user","password":"p@ss"}');
    const repository = new SiteMinderSecretRepository({ secretName: "domits/siteminder/pmsxchange", client });

    expect(await repository.getCredentials()).toEqual({ username: "user", password: "p@ss" });
    expect(await repository.getCredentials()).toEqual({ username: "user", password: "p@ss" });
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0][0].input).toEqual({ SecretId: "domits/siteminder/pmsxchange" });
  });

  test("fails clearly on a secret that is not JSON or misses a field", async () => {
    await expect(new SiteMinderSecretRepository({ secretName: "s", client: clientReturning("plain") }).getCredentials()).rejects.toThrow("not JSON");
    await expect(new SiteMinderSecretRepository({ secretName: "s", client: clientReturning('{"username":"u"}') }).getCredentials()).rejects.toThrow(
      "needs a username and a password"
    );
  });
});
