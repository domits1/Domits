import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { DestinationPageController } from "../../functions/PropertyHandler/controller/destinationPageController.js";
import { handler } from "../../functions/PropertyHandler/index.js";
import { DestinationTreeService } from "../../functions/PropertyHandler/business/service/destinationTreeService.js";
import { DestinationSwitchRepository } from "../../functions/PropertyHandler/data/repository/destinationSwitchRepository.js";
import { DestinationPageRepository } from "../../functions/PropertyHandler/data/repository/destinationPageRepository.js";

const treeRow = (path, type, parentId, name, activeListings = 0) => ({
  id: path,
  type,
  parentId,
  slug: path.split("/").pop(),
  path,
  name,
  countryCode: type === "continent" ? null : "ES",
  activeListings,
});

const TREE_ROWS = [
  treeRow("/destinations/europe", "continent", null, "Europe"),
  treeRow("/destinations/europe/spain", "country", "/destinations/europe", "Spain"),
  treeRow("/destinations/europe/spain/marbella", "city", "/destinations/europe/spain", "Marbella", 2),
];

const controllerAnswering = (outcome) => {
  const destinationPageService = { serve: jest.fn(async () => outcome) };
  return { controller: new DestinationPageController(destinationPageService), destinationPageService };
};

const HTML = "text/html; charset=utf-8";

const HOST_HEADERS = [
  { "X-Forwarded-Host": "acceptance.domits.com" },
  { "x-forwarded-host": "unknown.example" },
  { "X-Forwarded-Host": "www.domits.com:443", Host: "acceptance.domits.com" },
  {},
  null,
];

describe("the destination page controller", () => {
  it("passes only the path to the page service, whatever the headers", async () => {
    const { controller, destinationPageService } = controllerAnswering({ kind: "not_found", html: "x" });

    await controller.getDestinationPage({
      path: "/destinations/europe",
      headers: { "X-Forwarded-Host": "acceptance.domits.com", Cookie: "session=1", "X-Forwarded-For": "203.0.113.9" },
    });
    await controller.getDestinationPage({ path: "/destinations/asia", headers: null });

    expect(destinationPageService.serve.mock.calls).toEqual([
      [{ path: "/destinations/europe" }],
      [{ path: "/destinations/asia" }],
    ]);
  });

  it("asks for the sitemap without any request data", async () => {
    const destinationPageService = { serveSitemap: jest.fn(async () => ({ kind: "not_found", html: "x" })) };
    const controller = new DestinationPageController(destinationPageService);

    await controller.getDestinationSitemap({ headers: { "X-Forwarded-Host": "acceptance.domits.com" } });

    expect(destinationPageService.serveSitemap.mock.calls).toEqual([[]]);
  });

  it.each([
    [
      "a page",
      { kind: "page", html: "<p>page</p>", cacheControl: "public, max-age=300" },
      {
        statusCode: 200,
        headers: { "Content-Type": HTML, "Cache-Control": "public, max-age=300" },
        body: "<p>page</p>",
      },
    ],
    [
      "a redirect",
      { kind: "redirect", location: "/destinations/europe" },
      {
        statusCode: 301,
        headers: { "Content-Type": HTML, "Cache-Control": "public, max-age=3600", Location: "/destinations/europe" },
        body: "",
      },
    ],
    [
      "not found",
      { kind: "not_found", html: "<p>none</p>" },
      {
        statusCode: 404,
        headers: { "Content-Type": HTML, "Cache-Control": "public, max-age=60" },
        body: "<p>none</p>",
      },
    ],
    [
      "unavailable",
      { kind: "unavailable", html: "<p>later</p>" },
      {
        statusCode: 503,
        headers: { "Content-Type": HTML, "Cache-Control": "no-store", "Retry-After": "60" },
        body: "<p>later</p>",
      },
    ],
  ])("answers %s with its status, content type and cache header", async (_, outcome, response) => {
    const { controller } = controllerAnswering(outcome);
    expect(await controller.getDestinationPage({ path: "/destinations/europe" })).toEqual(response);
  });
});

describe("the destination menu controller", () => {
  const JSON_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  const MENU = { continents: [{ name: "Europe", path: "/destinations/europe", activeListings: 2, countries: [] }] };

  it.each([
    [
      "the menu while the switch is on",
      { kind: "menu", menu: MENU },
      { statusCode: 200, cacheControl: "public, max-age=300", body: MENU },
    ],
    [
      "an empty menu while the switch is off",
      { kind: "menu_off" },
      { statusCode: 200, cacheControl: "public, max-age=60", body: { continents: [] } },
    ],
    [
      "503 without caching when the menu is unavailable",
      { kind: "unavailable", html: "<p>later</p>" },
      {
        statusCode: 503,
        cacheControl: "no-store",
        body: { message: "Destinations are not available right now." },
        retryAfter: "60",
      },
    ],
  ])("answers %s as JSON", async (_, outcome, { statusCode, cacheControl, body, retryAfter }) => {
    const destinationPageService = { serveMenu: jest.fn(async () => outcome) };
    const response = await new DestinationPageController(destinationPageService).getDestinationMenu();

    expect(response.statusCode).toBe(statusCode);
    expect(response.headers).toMatchObject({ ...JSON_HEADERS, "Cache-Control": cacheControl });
    expect(response.headers["Retry-After"]).toBe(retryAfter);
    expect(JSON.parse(response.body)).toEqual(body);
    expect(destinationPageService.serveMenu.mock.calls).toEqual([[]]);
  });
});

describe("a destination request through the property handler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const request = (resource, path, headers = { "X-Forwarded-Host": "www.domits.com" }) =>
    handler({ httpMethod: "GET", resource, path, headers });

  it("serves the same page with the www canonical on every host, with links that stay on the host", async () => {
    jest.useFakeTimers({ now: Date.now() + 120000, doNotFake: ["setTimeout", "clearTimeout"] });
    jest.spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn").mockResolvedValue(true);
    jest.spyOn(DestinationPageRepository.prototype, "listDestinationsWithActiveListings").mockResolvedValue(TREE_ROWS);
    jest
      .spyOn(DestinationPageRepository.prototype, "listActiveListingsUnderPath")
      .mockResolvedValue([
        { id: "p1", title: "Villa", city: "Marbella", country: "Spain", nightlyRate: 200, imageUrl: "" },
      ]);
    const path = "/destinations/europe/spain/marbella";
    const canonical = `https://www.domits.com${path}`;

    const responses = [];
    for (const headers of HOST_HEADERS) {
      responses.push(await request("/destinations/{proxy+}", path, headers));
    }

    expect(responses.map((response) => response.statusCode)).toEqual(HOST_HEADERS.map(() => 200));
    expect(new Set(responses.map((response) => response.body)).size).toBe(1);
    const body = responses[0].body;
    expect(body).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(body).toContain(`<meta property="og:url" content="${canonical}">`);
    expect(body).toContain('"item":"https://www.domits.com/destinations/europe/spain"');
    expect([...new Set([...body.matchAll(/https?:\/\/([^/"<\s]+)/g)].map((match) => match[1]))].sort()).toEqual([
      "schema.org",
      "www.domits.com",
    ]);
    expect(body).toContain('<a href="/destinations/europe/spain">Spain</a>');
    expect(body).toContain('<a href="/listingdetails?ID=p1">');
  });

  it("answers 503 without caching on the root resource when the switch cannot be read", async () => {
    jest.useFakeTimers({ now: Date.now() + 240000, doNotFake: ["setTimeout", "clearTimeout"] });
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest
      .spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn")
      .mockRejectedValue(Object.assign(new Error("denied"), { name: "AccessDeniedException" }));
    const render = jest.spyOn(DestinationTreeService.prototype, "renderDestinationPage");

    const response = await request("/destinations", "/destinations");

    expect(response.statusCode).toBe(503);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(render).not.toHaveBeenCalled();
  });

  it("redirects a trailing slash and refuses a made up path without the switch or the database", async () => {
    jest.useFakeTimers({ now: Date.now() + 360000, doNotFake: ["setTimeout", "clearTimeout"] });
    const switchRead = jest.spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn");
    const render = jest.spyOn(DestinationTreeService.prototype, "renderDestinationPage");

    const redirect = await request("/destinations/{proxy+}", "/destinations/europe/");
    const madeUp = await request("/destinations/{proxy+}", "/destinations/x/y/z/w");

    expect(redirect.statusCode).toBe(301);
    expect(redirect.headers.Location).toBe("/destinations/europe");
    expect(madeUp.statusCode).toBe(404);
    expect(switchRead).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it("serves the root page on the root resource from the real tree", async () => {
    jest.useFakeTimers({ now: Date.now() + 480000, doNotFake: ["setTimeout", "clearTimeout"] });
    jest.spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn").mockResolvedValue(true);
    jest.spyOn(DestinationPageRepository.prototype, "listDestinationsWithActiveListings").mockResolvedValue(TREE_ROWS);

    const response = await request("/destinations", "/destinations");

    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("public, max-age=300");
    expect(response.body).toContain('<a href="/destinations/europe/spain">Spain</a>');
  });
});

describe("the destination sitemap through the property handler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const at = (offsetMs) =>
    jest.useFakeTimers({ now: Date.now() + offsetMs, doNotFake: ["setTimeout", "clearTimeout"] });
  const sitemap = (headers = { "x-forwarded-host": "acceptance.domits.com" }) =>
    handler({
      httpMethod: "GET",
      resource: "/sitemap-destinations.xml",
      path: "/sitemap-destinations.xml",
      headers,
    });
  const switchOn = (on = true) =>
    jest.spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn").mockResolvedValue(on);
  const treeRows = (rows) =>
    jest.spyOn(DestinationPageRepository.prototype, "listDestinationsWithActiveListings").mockResolvedValue(rows);

  it("serves the destinations that have a page, the root page included, with www URLs, as XML for five minutes", async () => {
    at(600000);
    switchOn();
    treeRows(TREE_ROWS);

    const response = await sitemap();

    expect(response.statusCode).toBe(200);
    expect(response.headers["Content-Type"]).toBe("application/xml");
    expect(response.headers["Cache-Control"]).toBe("public, max-age=300");
    expect(response.body.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      "<loc>https://www.domits.com/destinations</loc>",
      "<loc>https://www.domits.com/destinations/europe</loc>",
      "<loc>https://www.domits.com/destinations/europe/spain</loc>",
      "<loc>https://www.domits.com/destinations/europe/spain/marbella</loc>",
    ]);
  });

  it("serves the same sitemap with only www URLs on every host", async () => {
    at(720000);
    switchOn();
    treeRows(TREE_ROWS);
    const responses = [];
    for (const headers of HOST_HEADERS) {
      responses.push(await sitemap(headers));
    }
    expect(responses.map((response) => response.statusCode)).toEqual(HOST_HEADERS.map(() => 200));
    expect(new Set(responses.map((response) => response.body)).size).toBe(1);
    const locations = responses[0].body.match(/<loc>[^<]+<\/loc>/g);
    expect(locations).toHaveLength(4);
    expect(locations.every((location) => location.startsWith("<loc>https://www.domits.com/destinations"))).toBe(true);
  });

  it("answers 404 instead of an empty sitemap when no destination has a page", async () => {
    at(840000);
    switchOn();
    treeRows(TREE_ROWS.map((row) => ({ ...row, activeListings: 0 })));
    const response = await sitemap();
    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("<urlset");
  });

  it("answers 404 without reading the tree while the switch is off", async () => {
    at(960000);
    switchOn(false);
    const read = treeRows(TREE_ROWS);
    const response = await sitemap();
    expect(response.statusCode).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });

  it("answers 503 without caching when the database fails, and logs no request data", async () => {
    at(1080000);
    const logs = ["error", "warn", "log", "info"].map((level) =>
      jest.spyOn(console, level).mockImplementation(() => {})
    );
    switchOn();
    jest
      .spyOn(DestinationPageRepository.prototype, "listDestinationsWithActiveListings")
      .mockRejectedValue(new Error("connection refused"));
    const response = await sitemap({
      "x-forwarded-host": "acceptance.domits.com",
      Cookie: "session=secret-cookie-value",
      "X-Forwarded-For": "203.0.113.7",
    });
    expect(response.statusCode).toBe(503);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    const logged = JSON.stringify(logs.map((spy) => spy.mock.calls));
    expect(logged).toContain("connection refused");
    expect(logged).not.toMatch(/secret-cookie-value|203\.0\.113\.7|acceptance\.domits\.com|x-forwarded-host/i);
  });

  it("answers 503 and names the limit instead of a cut off sitemap when there are more than 50000 destinations", async () => {
    at(1200000);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    switchOn();
    const many = Array.from({ length: 50001 }, (_, index) =>
      treeRow(`/destinations/europe/spain/city-${index}`, "city", "/destinations/europe/spain", `City ${index}`, 1)
    );
    treeRows([...TREE_ROWS.slice(0, 2), ...many]);
    const response = await sitemap();
    expect(response.statusCode).toBe(503);
    expect(JSON.stringify(log.mock.calls)).toContain("A sitemap holds at most 50000 entries");
  });

  it("answers 503 and names the limit when the sitemap is too large for one Lambda response", async () => {
    at(1440000);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    switchOn();
    const long = Array.from({ length: 25000 }, (_, index) =>
      treeRow(
        `/destinations/europe/spain/city-${index}-${"a".repeat(150)}`,
        "city",
        "/destinations/europe/spain",
        `City ${index}`,
        1
      )
    );
    treeRows([...TREE_ROWS.slice(0, 2), ...long]);
    const response = await sitemap();
    expect(response.statusCode).toBe(503);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(JSON.stringify(log.mock.calls)).toContain("larger than 5242880 bytes");
  });
});

describe("the destination menu through the property handler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const at = (offsetMs) =>
    jest.useFakeTimers({ now: Date.now() + offsetMs, doNotFake: ["setTimeout", "clearTimeout"] });
  const menu = () =>
    handler({
      httpMethod: "GET",
      resource: "/property/destinations/menu",
      path: "/property/destinations/menu",
      headers: { "X-Forwarded-Host": "acceptance.domits.com" },
    });
  const switchOn = (on) =>
    jest.spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn").mockResolvedValue(on);
  const treeRows = () =>
    jest.spyOn(DestinationPageRepository.prototype, "listDestinationsWithActiveListings").mockResolvedValue(TREE_ROWS);

  it("answers an empty list without reading the tree while the switch is off", async () => {
    at(1560000);
    switchOn(false);
    const read = treeRows();

    const response = await menu();

    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("public, max-age=60");
    expect(JSON.parse(response.body)).toEqual({ continents: [] });
    expect(read).not.toHaveBeenCalled();
  });

  it("answers the destinations with a page, with relative links, while the switch is on", async () => {
    at(1680000);
    switchOn(true);
    treeRows();

    const response = await menu();

    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("public, max-age=300");
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(JSON.parse(response.body)).toEqual({
      continents: [
        {
          name: "Europe",
          path: "/destinations/europe",
          activeListings: 2,
          countries: [
            {
              name: "Spain",
              path: "/destinations/europe/spain",
              activeListings: 2,
              cities: [{ name: "Marbella", path: "/destinations/europe/spain/marbella", activeListings: 2 }],
            },
          ],
        },
      ],
    });
    expect(response.body).not.toMatch(/domits\.com|https?:/);
  });

  it("answers 503 without caching and without reading the tree when the switch cannot be read", async () => {
    at(1800000);
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest
      .spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn")
      .mockRejectedValue(Object.assign(new Error("denied"), { name: "AccessDeniedException" }));
    const read = treeRows();

    const response = await menu();

    expect(response.statusCode).toBe(503);
    expect(response.headers).toMatchObject({ "Cache-Control": "no-store", "Retry-After": "60" });
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(JSON.parse(response.body)).toEqual({ message: "Destinations are not available right now." });
    expect(read).not.toHaveBeenCalled();
  });
});
