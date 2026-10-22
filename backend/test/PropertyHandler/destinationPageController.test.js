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

describe("the destination page controller", () => {
  it("passes the path and the forwarded host, whatever its case, and nothing else", async () => {
    const { controller, destinationPageService } = controllerAnswering({ kind: "not_found", html: "x" });

    await controller.getDestinationPage({
      path: "/destinations/europe",
      headers: { "X-Forwarded-Host": "acceptance.domits.com", Cookie: "session=1", "X-Forwarded-For": "203.0.113.9" },
    });
    await controller.getDestinationPage({ path: "/destinations/asia", headers: null });
    await controller.getDestinationPage({
      path: "/destinations/asia",
      headers: { "x-forwarded-host": "www.domits.com" },
    });

    expect(destinationPageService.serve).toHaveBeenNthCalledWith(1, {
      path: "/destinations/europe",
      forwardedHost: "acceptance.domits.com",
    });
    expect(destinationPageService.serve).toHaveBeenNthCalledWith(2, {
      path: "/destinations/asia",
      forwardedHost: undefined,
    });
    expect(destinationPageService.serve).toHaveBeenNthCalledWith(3, {
      path: "/destinations/asia",
      forwardedHost: "www.domits.com",
    });
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

describe("a destination request through the property handler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const request = (resource, path) =>
    handler({ httpMethod: "GET", resource, path, headers: { "X-Forwarded-Host": "www.domits.com" } });

  it("serves a page on the proxy resource from the tree with the www origin", async () => {
    jest.useFakeTimers({ now: Date.now() + 120000, doNotFake: ["setTimeout", "clearTimeout"] });
    jest.spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn").mockResolvedValue(true);
    const render = jest
      .spyOn(DestinationTreeService.prototype, "renderDestinationPage")
      .mockResolvedValue({ html: "<p>Spain</p>", cacheControl: "public, max-age=300" });

    const response = await request("/destinations/{proxy+}", "/destinations/europe/spain");

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("<p>Spain</p>");
    expect(render).toHaveBeenCalledWith("/destinations/europe/spain", { siteOrigin: "https://www.domits.com" });
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
  const sitemap = (host = "acceptance.domits.com") =>
    handler({
      httpMethod: "GET",
      resource: "/sitemap-destinations.xml",
      path: "/sitemap-destinations.xml",
      headers: { "x-forwarded-host": host },
    });
  const switchOn = (on = true) =>
    jest.spyOn(DestinationSwitchRepository.prototype, "isDestinationPagesSwitchOn").mockResolvedValue(on);
  const treeRows = (rows) =>
    jest.spyOn(DestinationPageRepository.prototype, "listDestinationsWithActiveListings").mockResolvedValue(rows);

  it("serves only the destinations that have a page, the root page included, as XML for five minutes", async () => {
    at(600000);
    switchOn();
    treeRows(TREE_ROWS);

    const response = await sitemap();

    expect(response.statusCode).toBe(200);
    expect(response.headers["Content-Type"]).toBe("application/xml");
    expect(response.headers["Cache-Control"]).toBe("public, max-age=300");
    expect(response.body.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      "<loc>https://acceptance.domits.com/destinations</loc>",
      "<loc>https://acceptance.domits.com/destinations/europe</loc>",
      "<loc>https://acceptance.domits.com/destinations/europe/spain</loc>",
      "<loc>https://acceptance.domits.com/destinations/europe/spain/marbella</loc>",
    ]);
  });

  it("puts only hosts from the fixed list in the URLs", async () => {
    at(720000);
    switchOn();
    treeRows(TREE_ROWS);
    const response = await sitemap("evil.example");
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("evil.example");
    expect(response.body).toContain("<loc>https://www.domits.com/destinations</loc>");
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
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    switchOn();
    jest
      .spyOn(DestinationPageRepository.prototype, "listDestinationsWithActiveListings")
      .mockRejectedValue(new Error("connection refused"));
    const response = await sitemap();
    expect(response.statusCode).toBe(503);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/acceptance\.domits\.com|x-forwarded-host/i);
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
