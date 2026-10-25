import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const DIRECTORY = join(process.cwd(), "infrastructure", "static-page-edge");
const SOURCE = readFileSync(join(DIRECTORY, "viewer-request.js"), "utf8");
const CASES = JSON.parse(readFileSync(join(DIRECTORY, "cases.json"), "utf8"));
const REDIRECT_CASES = JSON.parse(readFileSync(join(DIRECTORY, "redirect-cases.json"), "utf8"));
const IMPORT_LINE = 'import cf from "cloudfront";\n';
const REDIRECT_CACHE_CONTROL = "public, max-age=3600";
const FUNCTION_SIZE_LIMIT_BYTES = 10 * 1024;
const HOSTNAME_LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const PAGE_KEY_PATTERN = new RegExp(
  `^/sites/by-host/((?:${HOSTNAME_LABEL}\\.)+${HOSTNAME_LABEL})/(?:index\\.html|sitemap\\.xml)$`
);

const robotsResponseFor = (host, method) => {
  const response = {
    statusCode: 200,
    statusDescription: "OK",
    headers: {
      "content-type": { value: "text/plain; charset=utf-8" },
      "cache-control": { value: "public, max-age=300" },
    },
  };
  if (method === "HEAD") {
    return response;
  }
  return {
    ...response,
    body: { encoding: "text", data: `User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml\n` },
  };
};

const buildKeyValueStore = (redirects, storeFails) => ({
  kvs: () => {
    if (storeFails) {
      throw new Error("no key value store is associated");
    }
    const has = (key) => Object.hasOwn(redirects, key);
    return {
      get: async (key) => (has(key) ? redirects[key] : Promise.reject(new Error("KeyNotFound"))),
      exists: async (key) => has(key),
    };
  },
});

const loadHandler = (redirects = {}, { storeFails = false } = {}) =>
  vm.runInNewContext(`${SOURCE.replace(IMPORT_LINE, "")}\nhandler`, { cf: buildKeyValueStore(redirects, storeFails) });

const buildHostHeader = (host, multiValue) => {
  if (host === null) {
    return {};
  }
  const header = { value: host };
  if (multiValue) {
    header.multiValue = multiValue.map((value) => ({ value }));
  }
  return { host: header };
};

const buildEvent = ({ method, uri, host, multiValue, querystring = {} }) => ({
  version: "1.0",
  context: { eventType: "viewer-request" },
  viewer: { ip: "203.0.113.1" },
  request: {
    method,
    uri,
    querystring,
    headers: buildHostHeader(host, multiValue),
    cookies: {},
  },
});

const rewrittenCases = CASES.filter((testCase) => testCase.expectedUri && testCase.expectedUri !== testCase.uri);

describe("the viewer request function source", () => {
  it("fits the CloudFront Function limit and compiles", () => {
    expect(Buffer.byteLength(SOURCE, "utf8")).toBeLessThan(FUNCTION_SIZE_LIMIT_BYTES);
    expect(() => new vm.Script(SOURCE.replace(IMPORT_LINE, ""))).not.toThrow();
    expect(typeof loadHandler()).toBe("function");
  });

  it("imports nothing but the cloudfront module, and uses no network or timers", () => {
    expect(SOURCE.match(/^import .*$/gm) || []).toEqual(SOURCE.includes(IMPORT_LINE) ? [IMPORT_LINE.trim()] : []);
    expect(SOURCE).not.toMatch(/\b(export|require|fetch|setTimeout|setInterval|XMLHttpRequest)\b/);
  });

  it("awaits only as the whole right side of a variable, the one form the CloudFront runtime accepts", () => {
    const awaits = SOURCE.split("\n").filter((line) => /\bawait\b/.test(line));
    expect(awaits.length).toBeGreaterThan(0);
    for (const line of awaits) {
      expect(line).toMatch(/^\s*var [A-Za-z]+ = await [A-Za-z.]+\([A-Za-z]*\);$/);
    }
  });

  it("carries no comments", () => {
    const withoutStrings = SOURCE.replaceAll(/"(?:[^"\\\n]|\\.)*"/g, '""');
    expect(withoutStrings).not.toMatch(/\/\/|\/\*/);
    expect(withoutStrings).toContain("isPageKeyRequest");
  });
});

describe("the viewer request function", () => {
  it.each(CASES.map((testCase) => [testCase.name, testCase]))("%s", async (_name, testCase) => {
    const handler = loadHandler();
    const event = buildEvent(testCase);
    const original = JSON.parse(JSON.stringify(event.request));

    const result = await handler(event);

    if (testCase.expectedRobotsFor) {
      expect(result).toEqual(robotsResponseFor(testCase.expectedRobotsFor, testCase.method));
      expect(event.request).toEqual(original);
      return;
    }
    if (testCase.expectedStatus) {
      expect(result).toEqual({ statusCode: testCase.expectedStatus, statusDescription: "Not Found" });
      expect(event.request).toEqual(original);
      return;
    }
    expect(result).toBe(event.request);
    expect(result.uri).toBe(testCase.expectedUri);
    expect({ ...result, uri: original.uri }).toEqual(original);
  });

  it("rewrites only to keys whose hostname passes the label and length rules of the store", () => {
    expect(rewrittenCases.length).toBeGreaterThan(0);
    for (const testCase of rewrittenCases) {
      const match = PAGE_KEY_PATTERN.exec(testCase.expectedUri);
      expect(match).not.toBeNull();
      expect(match[1].length).toBeLessThanOrEqual(253);
    }
  });

  it("answers robots.txt only with the normalised hostname, so nothing from the header reaches the file", async () => {
    const robotsCases = CASES.filter((testCase) => testCase.expectedRobotsFor && testCase.method === "GET");
    expect(robotsCases.length).toBeGreaterThan(0);
    for (const testCase of robotsCases) {
      const body = (await loadHandler()(buildEvent(testCase))).body.data;
      expect(body).toMatch(
        new RegExp(
          `^User-agent: \\*\nAllow: /\nSitemap: https://(?:${HOSTNAME_LABEL}\\.)+${HOSTNAME_LABEL}/sitemap\\.xml\n$`
        )
      );
    }
  });

  it("answers a HEAD request for robots.txt with the same headers and no body", async () => {
    const head = await loadHandler()(buildEvent({ method: "HEAD", uri: "/robots.txt", host: "www.villasensual.nl" }));
    const get = await loadHandler()(buildEvent({ method: "GET", uri: "/robots.txt", host: "www.villasensual.nl" }));

    expect(head).not.toHaveProperty("body");
    expect(head.statusCode).toBe(200);
    expect(head.headers).toEqual(get.headers);
  });

  it("returns nothing instead of throwing when there is no event at all", async () => {
    expect(await loadHandler()(null)).toBeFalsy();
  });

  it("leaves the request alone when the headers are not an object, instead of failing the request", async () => {
    const handler = loadHandler();
    const event = buildEvent({ method: "GET", uri: "/", host: null });
    event.request.headers = null;

    expect(await handler(event)).toBe(event.request);
    expect(event.request.uri).toBe("/");
  });

  it("leaves the request alone when the uri is missing, instead of failing the request", async () => {
    const handler = loadHandler({ "www.villasensual.nl": "beautiful-home-amsterdam-6156b005.direct.domits.com" });
    const event = buildEvent({ method: "GET", uri: "/", host: "www.villasensual.nl" });
    delete event.request.uri;

    expect(await handler(event)).toBe(event.request);
    expect(event.request).not.toHaveProperty("uri");
  });

  it("returns the same request object, so CloudFront keeps the headers and cookies it already parsed", async () => {
    const handler = loadHandler();
    const event = buildEvent({ method: "GET", uri: "/", host: "www.villasensual.nl" });

    expect(await handler(event)).toBe(event.request);
  });
});

describe("the redirect from an alias to its primary domain", () => {
  it.each(REDIRECT_CASES.map((testCase) => [testCase.name, testCase]))("%s", async (_name, testCase) => {
    const handler = loadHandler(testCase.redirects || {}, { storeFails: testCase.storeFails });
    const event = buildEvent(testCase);
    const original = JSON.parse(JSON.stringify(event.request));

    const result = await handler(event);

    if (testCase.expectedLocation) {
      expect(result).toEqual({
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: {
          location: { value: testCase.expectedLocation },
          "cache-control": { value: REDIRECT_CACHE_CONTROL },
        },
      });
      expect(event.request).toEqual(original);
      return;
    }
    if (testCase.expectedStatus) {
      expect(result).toEqual({ statusCode: testCase.expectedStatus, statusDescription: "Not Found" });
      return;
    }
    expect(result).toBe(event.request);
    expect(result.uri).toBe(testCase.expectedUri);
  });

  it("never sends a visitor to a host that the store did not name", async () => {
    const locations = [];
    for (const testCase of REDIRECT_CASES.filter((candidate) => candidate.expectedLocation)) {
      const result = await loadHandler(testCase.redirects)(buildEvent(testCase));
      locations.push(new URL(result.headers.location.value).host);
    }
    expect(new Set(locations)).toEqual(new Set(["www.villasensual.nl"]));
  });
});
