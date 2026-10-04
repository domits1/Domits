import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const DIRECTORY = join(process.cwd(), "infrastructure", "static-page-edge");
const SOURCE = readFileSync(join(DIRECTORY, "viewer-request.js"), "utf8");
const CASES = JSON.parse(readFileSync(join(DIRECTORY, "cases.json"), "utf8"));
const FUNCTION_SIZE_LIMIT_BYTES = 10 * 1024;

const loadHandler = () => vm.runInNewContext(`${SOURCE}\nhandler`, {});

const buildEvent = ({ method, uri, host, querystring = {} }) => ({
  version: "1.0",
  context: { eventType: "viewer-request" },
  viewer: { ip: "203.0.113.1" },
  request: {
    method,
    uri,
    querystring,
    headers: host === null ? {} : { host: { value: host } },
    cookies: {},
  },
});

describe("the viewer request function source", () => {
  it("fits the CloudFront Function limit and uses nothing the runtime lacks", () => {
    expect(Buffer.byteLength(SOURCE, "utf8")).toBeLessThan(FUNCTION_SIZE_LIMIT_BYTES);
    expect(SOURCE).not.toMatch(/\b(import|export|require|async|await|fetch)\b/);
    expect(SOURCE).not.toMatch(/\/\/|\/\*/);
    expect(() => new vm.Script(SOURCE)).not.toThrow();
    expect(typeof loadHandler()).toBe("function");
  });
});

describe("the viewer request function", () => {
  it.each(CASES.map((testCase) => [testCase.name, testCase]))("%s", (_name, testCase) => {
    const handler = loadHandler();
    const event = buildEvent(testCase);
    const original = JSON.parse(JSON.stringify(event.request));

    const result = handler(event);

    expect(result.uri).toBe(testCase.expectedUri);
    expect({ ...result, uri: original.uri }).toEqual(original);
  });

  it("rewrites every case that expects a page to the same key the store writes", () => {
    const rewritten = CASES.filter((testCase) => testCase.expectedUri !== testCase.uri);
    expect(rewritten.length).toBeGreaterThan(0);
    for (const testCase of rewritten) {
      expect(testCase.expectedUri).toMatch(/^\/sites\/by-host\/[a-z0-9.-]+\/index\.html$/);
    }
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
