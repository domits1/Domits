import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  DESTINATION_RENDER_TIMEOUT_MS,
  DestinationPageService,
} from "../../functions/PropertyHandler/business/service/destinationPageService.js";

const PAGE = {
  html: "<!doctype html><title>Holiday rentals in Marbella | Domits</title>",
  cacheControl: "public, max-age=300",
};

const buildService = ({ switchOn = async () => true, render = async () => PAGE, clock = { now: 0 } } = {}) => {
  const destinationSwitchRepository = { isDestinationPagesSwitchOn: jest.fn(switchOn) };
  const destinationTreeService = { renderDestinationPage: jest.fn(render) };
  const service = new DestinationPageService({
    destinationSwitchRepository,
    destinationTreeService,
    now: () => clock.now,
  });
  return { service, destinationSwitchRepository, destinationTreeService, clock };
};

const awsError = (name) => Object.assign(new Error(`${name} from SSM`), { name });

describe("the destination page service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("renders a valid path with the origin from the fixed host list", async () => {
    const { service, destinationTreeService } = buildService();

    const outcome = await service.serve({
      path: "/destinations/europe/spain/marbella",
      forwardedHost: "acceptance.domits.com",
    });

    expect(outcome).toEqual({ kind: "page", html: PAGE.html, cacheControl: PAGE.cacheControl });
    expect(destinationTreeService.renderDestinationPage).toHaveBeenCalledWith("/destinations/europe/spain/marbella", {
      siteOrigin: "https://acceptance.domits.com",
    });
  });

  it("renders with the www origin when the forwarded host is not on the list", async () => {
    const { service, destinationTreeService } = buildService();
    await service.serve({ path: "/destinations/europe", forwardedHost: "evil.example" });
    expect(destinationTreeService.renderDestinationPage).toHaveBeenCalledWith("/destinations/europe", {
      siteOrigin: "https://www.domits.com",
    });
  });

  it("answers not found for an invalid path without reading the switch or the database", async () => {
    const { service, destinationSwitchRepository, destinationTreeService } = buildService();

    const outcome = await service.serve({ path: "/destinations/Europe/../x", forwardedHost: "www.domits.com" });

    expect(outcome.kind).toBe("not_found");
    expect(outcome.html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(destinationSwitchRepository.isDestinationPagesSwitchOn).not.toHaveBeenCalled();
    expect(destinationTreeService.renderDestinationPage).not.toHaveBeenCalled();
  });

  it("redirects one trailing slash without reading the switch or the database", async () => {
    const { service, destinationSwitchRepository, destinationTreeService } = buildService();

    expect(await service.serve({ path: "/destinations/europe/spain/" })).toEqual({
      kind: "redirect",
      location: "/destinations/europe/spain",
    });
    expect(destinationSwitchRepository.isDestinationPagesSwitchOn).not.toHaveBeenCalled();
    expect(destinationTreeService.renderDestinationPage).not.toHaveBeenCalled();
  });

  it("answers not found when the destination has no page", async () => {
    const { service } = buildService({ render: async () => null });
    const outcome = await service.serve({ path: "/destinations/europe/spain/ronda", forwardedHost: "www.domits.com" });
    expect(outcome.kind).toBe("not_found");
    expect(outcome.html).toContain('<a href="https://www.domits.com/destinations">All destinations</a>');
  });

  it("answers not found without rendering when the switch is off", async () => {
    const { service, destinationTreeService } = buildService({ switchOn: async () => false });
    const outcome = await service.serve({ path: "/destinations/europe/spain/marbella" });
    expect(outcome.kind).toBe("not_found");
    expect(outcome.html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(destinationTreeService.renderDestinationPage).not.toHaveBeenCalled();
  });

  it("answers unavailable, logs the error name and message but no request data, and renders nothing when the switch cannot be read", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const { service, destinationTreeService } = buildService({
      switchOn: async () => {
        throw awsError("AccessDeniedException");
      },
    });

    const outcome = await service.serve({
      path: "/destinations/europe/spain/marbella",
      forwardedHost: "www.domits.com",
    });

    expect(outcome.kind).toBe("unavailable");
    expect(outcome.html).toContain("Please try again in a minute.");
    expect(destinationTreeService.renderDestinationPage).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "Destination page unavailable:",
      "AccessDeniedException",
      "AccessDeniedException from SSM"
    );
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/www\.domits\.com|marbella/);
  });

  it("answers unavailable when the database fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { service } = buildService({
      render: async () => {
        throw new Error("connection refused");
      },
    });
    const outcome = await service.serve({ path: "/destinations/europe" });
    expect(outcome.kind).toBe("unavailable");
    expect(outcome.html).toContain("Please try again in a minute.");
  });

  it("answers unavailable when the database is slower than the render limit", async () => {
    jest.useFakeTimers();
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const { service } = buildService({ render: () => new Promise(() => {}) });

    const pending = service.serve({ path: "/destinations/europe" });
    await jest.advanceTimersByTimeAsync(DESTINATION_RENDER_TIMEOUT_MS);

    expect((await pending).kind).toBe("unavailable");
    expect(log).toHaveBeenCalledWith(
      "Destination page unavailable:",
      "DestinationRenderTimeout",
      "The destination page took too long to render."
    );
    expect(DESTINATION_RENDER_TIMEOUT_MS).toBe(5000);
  });

  it("answers unavailable within the limit when the switch read hangs, and reads the switch again next time", async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => {});
    const reads = [() => new Promise(() => {}), async () => true];
    const { service, destinationSwitchRepository } = buildService({ switchOn: () => reads.shift()() });

    const pending = service.serve({ path: "/destinations/europe" });
    await jest.advanceTimersByTimeAsync(DESTINATION_RENDER_TIMEOUT_MS);

    expect((await pending).kind).toBe("unavailable");
    expect((await service.serve({ path: "/destinations/europe" })).kind).toBe("page");
    expect(destinationSwitchRepository.isDestinationPagesSwitchOn).toHaveBeenCalledTimes(2);
  });

  it("clears the render limit once the page is rendered", async () => {
    jest.useFakeTimers();
    const { service } = buildService();
    await service.serve({ path: "/destinations/europe" });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("reads the switch once for two requests at the same time", async () => {
    let release;
    const { service, destinationSwitchRepository } = buildService({
      render: async (path) => ({ ...PAGE, html: path }),
      switchOn: () =>
        new Promise((resolve) => {
          release = () => resolve(true);
        }),
    });

    const first = service.serve({ path: "/destinations/europe" });
    const second = service.serve({ path: "/destinations/asia" });
    release();

    expect((await first).html).toBe("/destinations/europe");
    expect((await second).html).toBe("/destinations/asia");
    expect(destinationSwitchRepository.isDestinationPagesSwitchOn).toHaveBeenCalledTimes(1);
  });

  it("keeps the switch value for one minute and reads it again after that", async () => {
    const values = [false, true];
    const { service, destinationSwitchRepository, clock } = buildService({ switchOn: async () => values.shift() });

    expect((await service.serve({ path: "/destinations/europe" })).kind).toBe("not_found");
    clock.now = 59999;
    expect((await service.serve({ path: "/destinations/europe" })).kind).toBe("not_found");
    clock.now = 60000;
    expect((await service.serve({ path: "/destinations/europe" })).kind).toBe("page");
    expect(destinationSwitchRepository.isDestinationPagesSwitchOn).toHaveBeenCalledTimes(2);
  });

  it("does not keep a failed switch read, so the next request reads it again", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const results = [
      async () => {
        throw awsError("ThrottlingException");
      },
      async () => true,
    ];
    const { service, destinationSwitchRepository } = buildService({ switchOn: () => results.shift()() });

    expect((await service.serve({ path: "/destinations/europe" })).kind).toBe("unavailable");
    expect((await service.serve({ path: "/destinations/europe" })).kind).toBe("page");
    expect(destinationSwitchRepository.isDestinationPagesSwitchOn).toHaveBeenCalledTimes(2);
  });
});
