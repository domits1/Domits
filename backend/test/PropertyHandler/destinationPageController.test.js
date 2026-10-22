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
