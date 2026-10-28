import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const DIRECTORY = join(process.cwd(), "infrastructure", "static-page-edge");
const SOURCE = readFileSync(join(DIRECTORY, "viewer-request.js"), "utf8").replace('import cf from "cloudfront";\n', "");
const CASES = JSON.parse(readFileSync(join(DIRECTORY, "cases.json"), "utf8"));
const REDIRECT_CASES = JSON.parse(readFileSync(join(DIRECTORY, "redirect-cases.json"), "utf8"));
const ALIAS = "beautiful-home-amsterdam-6156b005.direct.domits.com";
const PRIMARY = "www.villasensual.nl";
const PLAIN_HOST = "villa-loiki-8cf98e11.direct.domits.com";

const countingKeyValueStore = (redirects = {}, { storeFails = false, failingCall = "" } = {}) => {
  const calls = [];
  const missingKeyReads = [];
  const has = (key) => Object.hasOwn(redirects, key);
  const store = {
    exists: async (key) => {
      calls.push(["exists", key]);
      if (failingCall === "exists") {
        throw new Error("the key value store did not answer");
      }
      return has(key);
    },
    get: async (key) => {
      calls.push(["get", key]);
      if (failingCall === "get") {
        throw new Error("KeyNotFound");
      }
      if (!has(key)) {
        missingKeyReads.push(key);
        throw new Error("KeyNotFound");
      }
      return redirects[key];
    },
  };
  return {
    calls,
    missingKeyReads,
    cf: {
      kvs: () => {
        calls.push(["kvs"]);
        if (storeFails) {
          throw new Error("no key value store is associated");
        }
        return store;
      },
    },
  };
};

const loadHandler = (store) => vm.runInNewContext(`${SOURCE}\nhandler`, { cf: store.cf });

const buildEvent = ({ method, uri, host, multiValue, querystring = {} }) => {
  const headers = {};
  if (host !== null) {
    headers.host = multiValue ? { value: host, multiValue: multiValue.map((value) => ({ value })) } : { value: host };
  }
  return {
    version: "1.0",
    context: { eventType: "viewer-request" },
    viewer: { ip: "203.0.113.1" },
    request: { method, uri, querystring, headers, cookies: {} },
  };
};

const outcomeOf = (result, request) => {
  if (result === request) {
    return { uri: result.uri };
  }
  if (result.statusCode === 301) {
    return { location: result.headers.location.value };
  }
  return { status: result.statusCode };
};

const expectedOutcomeOf = (testCase) => {
  if (testCase.expectedLocation) {
    return { location: testCase.expectedLocation };
  }
  if (testCase.expectedStatus) {
    return { status: testCase.expectedStatus };
  }
  if (testCase.expectedRobotsFor) {
    return { status: 200 };
  }
  return { uri: testCase.expectedUri };
};

const pageKeyOf = (host) => `/sites/by-host/${host}/index.html`;

describe("how the edge function reads the redirect store", () => {
  it("only asks whether a host without a key exists, so the missing key throws nothing", async () => {
    const store = countingKeyValueStore({ [ALIAS]: PRIMARY });
    const event = buildEvent({ method: "GET", uri: "/", host: PLAIN_HOST });

    const result = await loadHandler(store)(event);

    expect(outcomeOf(result, event.request)).toEqual({ uri: pageKeyOf(PLAIN_HOST) });
    expect(store.calls).toEqual([["kvs"], ["exists", PLAIN_HOST]]);
    expect(store.missingKeyReads).toEqual([]);
  });

  it("reads a key only after it exists, then checks once that the target is no key itself", async () => {
    const store = countingKeyValueStore({ [ALIAS]: PRIMARY });
    const event = buildEvent({ method: "GET", uri: "/", host: ALIAS });

    const result = await loadHandler(store)(event);

    expect(outcomeOf(result, event.request)).toEqual({ location: `https://${PRIMARY}/` });
    expect(store.calls).toEqual([["kvs"], ["exists", ALIAS], ["get", ALIAS], ["exists", PRIMARY]]);
  });

  it.each([
    ["the store does not answer whether the host exists", "exists"],
    ["the key is gone between the check and the read", "get"],
  ])("serves the page as before when %s", async (_name, failingCall) => {
    const store = countingKeyValueStore({ [ALIAS]: PRIMARY }, { failingCall });
    const event = buildEvent({ method: "GET", uri: "/", host: ALIAS });

    const result = await loadHandler(store)(event);

    expect(outcomeOf(result, event.request)).toEqual({ uri: pageKeyOf(ALIAS) });
  });

  it.each([...CASES, ...REDIRECT_CASES].map((testCase) => [testCase.name, testCase]))(
    "%s: same outcome, and no read of a missing key",
    async (_name, testCase) => {
      const store = countingKeyValueStore(testCase.redirects || {}, { storeFails: testCase.storeFails });
      const event = buildEvent(testCase);

      const result = await loadHandler(store)(event);

      expect(outcomeOf(result, event.request)).toEqual(expectedOutcomeOf(testCase));
      expect(store.missingKeyReads).toEqual([]);
    }
  );
});

describe("which requests look in the redirect store", () => {
  const CUSTOM_ALIAS = "booking.villasensual.nl";
  const BUILD_ASSETS = [
    "/static/js/main.c8d6f8b3.js",
    "/static/js/970.753e672b.chunk.js",
    "/static/js/main.c8d6f8b3.js.map",
    "/static/css/main.ce53b419.css",
    "/static/media/hero.4f2a1c9d.png",
    "/static/media/hero.4f2a1c9d.jpg",
    "/static/media/hero.4f2a1c9d.jpeg",
    "/static/media/loader.4f2a1c9d.gif",
    "/static/media/icon.4f2a1c9d.svg",
    "/static/media/hero.4f2a1c9d.webp",
    "/static/media/font.4f2a1c9d.woff",
    "/static/media/font.4f2a1c9d.woff2",
    "/static/media/font.4f2a1c9d.ttf",
    "/static/media/font.4f2a1c9d.eot",
    "/favicon.ico",
    "/manifest.json",
    "/logo192.png",
  ];
  const PAGES = [
    "/",
    "/index.html",
    "/robots.txt",
    "/sitemap.xml",
    "/listing/2",
    "/website-preview/draft-1",
    "/website-live/www.villasensual.nl",
    "/sitemap",
    "/INDEX.HTML",
    "/LOGO192.PNG",
    "/sitemap.xml/",
    "/static/",
    "/static/js/main.c8d6f8b3.js/",
    "/static.js/listing",
    "/index%2Ehtml",
  ];

  it.each(BUILD_ASSETS)("serves the build file %s on an alias as it is, without a lookup", async (uri) => {
    const store = countingKeyValueStore({ [ALIAS]: PRIMARY });
    const event = buildEvent({ method: "GET", uri, host: ALIAS });

    const result = await loadHandler(store)(event);

    expect(outcomeOf(result, event.request)).toEqual({ uri });
    expect(store.calls).toEqual([]);
  });

  it.each([
    ["a HEAD request", { method: "HEAD", uri: "/static/css/main.ce53b419.css", host: ALIAS }],
    [
      "a query string",
      { method: "GET", uri: "/static/js/main.c8d6f8b3.js", host: ALIAS, querystring: { v: { value: "2" } } },
    ],
    [
      "an alias in capitals with a port",
      { method: "GET", uri: "/favicon.ico", host: "Beautiful-Home-Amsterdam-6156b005.Direct.Domits.com:443" },
    ],
    ["an alias that is a custom domain", { method: "GET", uri: "/logo192.png", host: CUSTOM_ALIAS }],
  ])("serves a build file with %s as it is, without a lookup", async (_name, request) => {
    const store = countingKeyValueStore({ [ALIAS]: PRIMARY, [CUSTOM_ALIAS]: PRIMARY });
    const event = buildEvent(request);

    const result = await loadHandler(store)(event);

    expect(outcomeOf(result, event.request)).toEqual({ uri: request.uri });
    expect(store.calls).toEqual([]);
  });

  it.each(PAGES)("still looks up and redirects %s on an alias", async (uri) => {
    const store = countingKeyValueStore({ [ALIAS]: PRIMARY });
    const event = buildEvent({ method: "GET", uri, host: ALIAS });

    const result = await loadHandler(store)(event);

    expect(outcomeOf(result, event.request)).toEqual({ location: `https://${PRIMARY}${uri}` });
    expect(store.calls).toEqual([["kvs"], ["exists", ALIAS], ["get", ALIAS], ["exists", PRIMARY]]);
  });

  it("redirects a page of an alias that is a custom domain outside direct.domits.com", async () => {
    const store = countingKeyValueStore({ [CUSTOM_ALIAS]: PRIMARY });
    const event = buildEvent({ method: "HEAD", uri: "/listing/2", host: CUSTOM_ALIAS });

    const result = await loadHandler(store)(event);

    expect(outcomeOf(result, event.request)).toEqual({ location: `https://${PRIMARY}/listing/2` });
  });

  it.each([
    ["a POST", { method: "POST", uri: "/", host: ALIAS }],
    ["an OPTIONS request", { method: "OPTIONS", uri: "/", host: ALIAS }],
    ["no host header", { method: "GET", uri: "/", host: null }],
    ["a host the store can never hold", { method: "GET", uri: "/", host: "my_villa.direct.domits.com" }],
    ["a port that is not a number", { method: "GET", uri: "/", host: `${ALIAS}:garbage` }],
    ["two host values", { method: "GET", uri: "/", host: ALIAS, multiValue: [ALIAS, PRIMARY] }],
    ["a direct request to a page key", { method: "GET", uri: `/sites/by-host/${PRIMARY}/index.html`, host: ALIAS }],
  ])("looks nothing up for %s", async (_name, request) => {
    const store = countingKeyValueStore({ [ALIAS]: PRIMARY, "my_villa.direct.domits.com": PRIMARY });

    await loadHandler(store)(buildEvent(request));

    expect(store.calls).toEqual([]);
  });
});
