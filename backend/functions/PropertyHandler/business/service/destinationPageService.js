import { DestinationSwitchRepository } from "../../data/repository/destinationSwitchRepository.js";
import { buildDestinationNotFoundPage, buildDestinationUnavailablePage } from "./destinationPageBuilder.js";
import { readDestinationRequestPath, resolveDestinationSiteOrigin } from "./destinationPageRequest.js";
import { DestinationTreeService } from "./destinationTreeService.js";
import { createExpiringRead } from "../../util/expiringRead.js";

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

    try {
      if (!(await this.readSwitch())) {
        return notFound;
      }
      const page = await this.renderWithinLimit(request.path, siteOrigin);
      return page ? { kind: "page", html: page.html, cacheControl: page.cacheControl } : notFound;
    } catch (error) {
      console.error("Destination page unavailable:", error?.name, error?.message);
      return { kind: "unavailable", html: buildDestinationUnavailablePage() };
    }
  }

  async renderWithinLimit(path, siteOrigin) {
    let timer;
    const limit = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new DestinationRenderTimeout()), this.renderTimeoutMs);
    });
    try {
      return await Promise.race([this.destinationTreeService.renderDestinationPage(path, { siteOrigin }), limit]);
    } finally {
      clearTimeout(timer);
    }
  }
}
