import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { replaceAliases } from "../../infrastructure/static-page-edge/alias-map.mjs";

const SOURCE = readFileSync(join(process.cwd(), "infrastructure", "static-page-edge", "viewer-request.js"), "utf8");
const ALIAS = "beautiful-home-amsterdam-6156b005.direct.domits.com";
const PRIMARY = "www.villasensual.nl";
const CUSTOM_ALIAS = "booking.villasensual.nl";
const INVALID_HOST = "my_villa.direct.domits.com";

const loadHandler = (aliases) => vm.runInNewContext(`${replaceAliases(SOURCE, Object.entries(aliases))}\nhandler`);

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

describe("which requests on an alias redirect to its primary domain", () => {
  const BUILD_ASSETS = [
    "/static/js/main.c8d6f8b3.js",
    "/static/js/970.753e672b.chunk.js",
    "/static/js/main.c8d6f8b3.js.map",
    "/static/js/main.c8d6f8b3.js.LICENSE.txt",
    "/static/css/main.ce53b419.css",
    "/static/media/hero.4f2a1c9d.webp",
    "/static/media/font.4f2a1c9d.woff2",
    "/static/media/intro.4f2a1c9d.mp4",
    "/asset-manifest.json",
    "/favicon.ico",
    "/logo.svg",
    "/logo192.png",
    "/logo512.png",
    "/manifest.json",
  ];
  const PAGES = [
    "/",
    "/index.html",
    "/robots.txt",
    "/sitemap.xml",
    "/listing/2",
    "/website-preview/draft-1",
    "/website-live/www.villasensual.nl",
    "/website-live/villasensual.map",
    "/offers.json",
    "/listing/2/photo.png",
    "/listing/static/hero.png",
    "/sitemap",
    "/static",
    "/static.js/listing",
    "/STATIC/js/main.c8d6f8b3.js",
    "/INDEX.HTML",
    "/LOGO192.PNG",
    "/favicon.ico/",
    "/sitemap.xml/",
    "/index%2Ehtml",
  ];

  it.each(BUILD_ASSETS)("serves the build file %s on an alias as it is", (uri) => {
    const event = buildEvent({ method: "GET", uri, host: ALIAS });
    const original = JSON.parse(JSON.stringify(event.request));

    const result = loadHandler({ [ALIAS]: PRIMARY })(event);

    expect(result).toBe(event.request);
    expect(event.request).toEqual(original);
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
  ])("serves a build file with %s as it is", (_name, request) => {
    const event = buildEvent(request);
    const original = JSON.parse(JSON.stringify(event.request));

    const result = loadHandler({ [ALIAS]: PRIMARY, [CUSTOM_ALIAS]: PRIMARY })(event);

    expect(result).toBe(event.request);
    expect(event.request).toEqual(original);
  });

  it.each(PAGES)("redirects %s on an alias", (uri) => {
    const event = buildEvent({ method: "GET", uri, host: ALIAS });

    const result = loadHandler({ [ALIAS]: PRIMARY })(event);

    expect(outcomeOf(result, event.request)).toEqual({ location: `https://${PRIMARY}${uri}` });
  });

  it("redirects a page of an alias that is a custom domain outside direct.domits.com", () => {
    const event = buildEvent({ method: "HEAD", uri: "/listing/2", host: CUSTOM_ALIAS });

    const result = loadHandler({ [CUSTOM_ALIAS]: PRIMARY })(event);

    expect(outcomeOf(result, event.request)).toEqual({ location: `https://${PRIMARY}/listing/2` });
  });

  it("never redirects a uri without a leading slash, so nothing can be added to the target host", () => {
    const event = buildEvent({ method: "GET", uri: "@other.example/", host: ALIAS });

    const result = loadHandler({ [ALIAS]: PRIMARY })(event);

    expect(outcomeOf(result, event.request)).toEqual({ uri: "@other.example/" });
  });

  it.each([
    ["a POST", { method: "POST", uri: "/", host: ALIAS }, { uri: "/" }],
    ["an OPTIONS request", { method: "OPTIONS", uri: "/", host: ALIAS }, { uri: "/" }],
    ["no host header", { method: "GET", uri: "/", host: null }, { uri: "/" }],
    [
      "a host that fails the hostname rule while the map holds it",
      { method: "GET", uri: "/", host: INVALID_HOST },
      { uri: "/" },
    ],
    ["a port that is not a number", { method: "GET", uri: "/", host: `${ALIAS}:garbage` }, { uri: "/" }],
    ["two host values", { method: "GET", uri: "/", host: ALIAS, multiValue: [ALIAS, PRIMARY] }, { uri: "/" }],
    [
      "a direct request to a page key",
      { method: "GET", uri: `/sites/by-host/${PRIMARY}/index.html`, host: ALIAS },
      { status: 404 },
    ],
  ])("does not redirect %s", (_name, request, expected) => {
    const event = buildEvent(request);

    const result = loadHandler({ [ALIAS]: PRIMARY, [INVALID_HOST]: PRIMARY })(event);

    expect(outcomeOf(result, event.request)).toEqual(expected);
  });
});
