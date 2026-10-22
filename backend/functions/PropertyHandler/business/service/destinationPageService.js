import { DestinationSwitchRepository } from "../../data/repository/destinationSwitchRepository.js";
import { buildDestinationNotFoundPage, buildDestinationUnavailablePage } from "./destinationPageBuilder.js";
import { readDestinationRequestPath, resolveDestinationSiteOrigin } from "./destinationPageRequest.js";
import { DestinationTreeService } from "./destinationTreeService.js";
import { createExpiringRead } from "../../util/expiringRead.js";
import { withinTimeLimit } from "../../util/timeLimit.js";

export const DESTINATION_SWITCH_TTL_MS = 60000;
export const DESTINATION_RENDER_TIMEOUT_MS = 5000;

class DestinationRenderTimeout extends Error {
  constructor() {
    super("The destination page took too long to render.");
    this.name = "DestinationRenderTimeout";
  }
}

export class DestinationPageService {
  constructor({
    destinationTreeService = new DestinationTreeService(),
    destinationSwitchRepository = new DestinationSwitchRepository(),
    now = () => Date.now(),
    renderTimeoutMs = DESTINATION_RENDER_TIMEOUT_MS,
  } = {}) {
    this.destinationTreeService = destinationTreeService;
    this.destinationSwitchRepository = destinationSwitchRepository;
    this.renderTimeoutMs = renderTimeoutMs;
    this.readSwitch = createExpiringRead({
      read: () => this.destinationSwitchRepository.isDestinationPagesSwitchOn(),
      ttlMs: DESTINATION_SWITCH_TTL_MS,
      timeoutMs: renderTimeoutMs,
      now,
    });
  }

  async serve({ path, forwardedHost } = {}) {
    const request = readDestinationRequestPath(path);
    if (request.kind === "redirect") {
      return { kind: "redirect", location: request.location };
    }
    const siteOrigin = resolveDestinationSiteOrigin(forwardedHost);
    const notFound = { kind: "not_found", html: buildDestinationNotFoundPage({ siteOrigin }) };
    if (request.kind !== "page") {
      return notFound;
    }

    return this.answer(
      () => this.destinationTreeService.renderDestinationPage(request.path, { siteOrigin }),
      notFound,
      (page) => ({ kind: "page", html: page.html, cacheControl: page.cacheControl })
    );
  }

  async serveSitemap({ forwardedHost } = {}) {
    const siteOrigin = resolveDestinationSiteOrigin(forwardedHost);
    return this.answer(
      () => this.destinationTreeService.renderDestinationSitemap({ siteOrigin }),
      { kind: "not_found", html: buildDestinationNotFoundPage({ siteOrigin }) },
      (xml) => ({ kind: "sitemap", xml })
    );
  }

  async answer(render, notFound, found) {
    try {
      const result = await withinTimeLimit(
        this.whenSwitchedOn(render),
        this.renderTimeoutMs,
        () => new DestinationRenderTimeout()
      );
      return result ? found(result) : notFound;
    } catch (error) {
      console.error("Destination page unavailable:", error?.name, error?.message);
      return { kind: "unavailable", html: buildDestinationUnavailablePage() };
    }
  }

  async whenSwitchedOn(render) {
    if (!(await this.readSwitch())) {
      return null;
    }
    return render();
  }
}
