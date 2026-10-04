import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const DIRECTORY = join(process.cwd(), "infrastructure", "static-page-edge");
const SOURCE = readFileSync(join(DIRECTORY, "viewer-request.js"), "utf8");
const CASES = JSON.parse(readFileSync(join(DIRECTORY, "cases.json"), "utf8"));
const FUNCTION_SIZE_LIMIT_BYTES = 10 * 1024;
const URI_LIMIT = 8192;
const HOSTNAME_LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const PAGE_KEY_PATTERN = new RegExp(`^/sites/by-host/((?:${HOSTNAME_LABEL}\\.)+${HOSTNAME_LABEL})/index\\.html$`);

const loadHandler = () => vm.runInNewContext(`${SOURCE}\nhandler`, {});

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
    expect(() => new vm.Script(SOURCE)).not.toThrow();
    expect(typeof loadHandler()).toBe("function");
  });

  it("uses no module syntax, no network and no timers, which the runtime does not have", () => {
    expect(SOURCE).not.toMatch(/\b(import|export|require|async|await|fetch|setTimeout|setInterval|XMLHttpRequest)\b/);
  });

  it("carries no comments", () => {
    expect(SOURCE).not.toMatch(/\/\/|\/\*/);
  });
});

describe("the viewer request function", () => {
  it.each(CASES.map((testCase) => [testCase.name, testCase]))("%s", (_name, testCase) => {
    const handler = loadHandler();
    const event = buildEvent(testCase);
    const original = JSON.parse(JSON.stringify(event.request));

    const result = handler(event);

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

  it("leaves the request alone when the rewritten uri plus the query string would pass the runtime limit", () => {
    const handler = loadHandler();
    const fits = buildEvent({ method: "GET", uri: "/", host: "www.villasensual.nl" });
    fits.request.querystring = { q: { value: "x".repeat(URI_LIMIT - 60) } };
    const tooLong = buildEvent({ method: "GET", uri: "/", host: "www.villasensual.nl" });
    tooLong.request.querystring = { q: { value: "x".repeat(URI_LIMIT - 40) } };

    expect(handler(fits).uri).toBe("/sites/by-host/www.villasensual.nl/index.html");
    expect(handler(tooLong).uri).toBe("/");
  });

  it("counts every value of a repeated query parameter against the limit", () => {
    const handler = loadHandler();
    const event = buildEvent({ method: "GET", uri: "/", host: "www.villasensual.nl" });
    const half = "x".repeat(URI_LIMIT / 2);
    event.request.querystring = { q: { value: half, multiValue: [{ value: half }, { value: half }] } };

    expect(handler(event).uri).toBe("/");
  });

  it("leaves the request alone when the headers are not an object, instead of failing the request", () => {
    const handler = loadHandler();
    const event = buildEvent({ method: "GET", uri: "/", host: null });
    event.request.headers = null;

    expect(handler(event)).toBe(event.request);
    expect(event.request.uri).toBe("/");
  });

  it("leaves the request alone when the uri is missing, instead of failing the request", () => {
    const handler = loadHandler();
    const event = buildEvent({ method: "GET", uri: "/", host: "www.villasensual.nl" });
    delete event.request.uri;

    expect(handler(event)).toBe(event.request);
    expect(event.request).not.toHaveProperty("uri");
  });

  it("returns the same request object, so CloudFront keeps the headers and cookies it already parsed", () => {
    const handler = loadHandler();
    const event = buildEvent({ method: "GET", uri: "/", host: "www.villasensual.nl" });

    expect(handler(event)).toBe(event.request);
  });
});
