import { describe, it, expect } from "@jest/globals";
import { StaticPageRedirects } from "../../functions/PropertyHandler/business/service/staticPageRedirects.js";
import { StaticPageRedirectStore } from "../../functions/PropertyHandler/data/repository/staticPageRedirectStore.js";
import { buildFakeKeyValueStoreClient } from "./fakeKeyValueStoreClient.js";

const KVS_ARN = "arn:aws:cloudfront::115462458880:key-value-store/redirects";
const ALIAS = "beautiful-home-amsterdam-6156b005.direct.domits.com";
const PRIMARY = "www.villasensual.nl";

const buildRedirects = ({ keys = {} } = {}) => {
  const client = buildFakeKeyValueStoreClient({ keys });
  const store = new StaticPageRedirectStore({ kvsArn: KVS_ARN, client });
  return { client, store, redirects: new StaticPageRedirects({ store }) };
};

describe("writing redirects to the key value store", () => {
  it("puts a redirect with the current version of the store, and removes it again", async () => {
    const { client, redirects } = buildRedirects();

    expect(await redirects.add([{ hostname: ALIAS, primary: PRIMARY }])).toBe(true);
    expect(Object.fromEntries(client.state.keys)).toEqual({ [ALIAS]: PRIMARY });
    expect(client.calls.find((call) => call.name === "UpdateKeysCommand").input).toEqual({
      KvsARN: KVS_ARN,
      IfMatch: "etag-1",
      Puts: [{ Key: ALIAS, Value: PRIMARY }],
    });

    expect(await redirects.remove([ALIAS, PRIMARY])).toBe(true);
    expect(client.state.keys.size).toBe(0);
  });

  it("only reads the store, without a write, when there is nothing to remove", async () => {
    const { client, redirects } = buildRedirects();

    expect(await redirects.remove([ALIAS])).toBe(false);
    expect(client.calls.map((call) => call.name)).toEqual(["DescribeKeyValueStoreCommand"]);
  });

  it("tries again with the new version when someone else wrote in between", async () => {
    const { client, redirects } = buildRedirects();
    client.writeBeforeNextUpdate();

    expect(await redirects.add([{ hostname: ALIAS, primary: PRIMARY }])).toBe(true);
    expect(client.state.keys.get(ALIAS)).toBe(PRIMARY);
    expect(client.state.keys.get("someone-else.example.com")).toBe("www.example.com");
    expect(client.calls.filter((call) => call.name === "UpdateKeysCommand")).toHaveLength(2);
  });

  it("gives up after three conflicts and lets the caller fail", async () => {
    const { client, redirects } = buildRedirects();
    client.writeBeforeNextUpdate();
    client.writeBeforeNextUpdate();
    client.writeBeforeNextUpdate();

    await expect(redirects.add([{ hostname: ALIAS, primary: PRIMARY }])).rejects.toThrow("Pre-Condition failed");
    expect(client.state.keys.has(ALIAS)).toBe(false);
  });

  it("splits more than fifty changes into parts that each use the version the previous part returned", async () => {
    const { client, store } = buildRedirects();
    const puts = Array.from({ length: 120 }, (_, n) => ({ hostname: `a${n}.direct.domits.com`, primary: PRIMARY }));

    await store.update({ etag: (await store.describe()).etag, puts });

    const updates = client.calls.filter((call) => call.name === "UpdateKeysCommand");
    expect(updates.map((call) => call.input.IfMatch)).toEqual(["etag-1", "etag-2", "etag-3"]);
    expect((await store.listRedirects()).get("a119.direct.domits.com")).toBe(PRIMARY);
    expect(client.calls.filter((call) => call.name === "ListKeysCommand")).toHaveLength(3);
  });
});
