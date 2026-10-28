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
