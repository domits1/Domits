import { DestinationSwitchRepository } from "../../data/repository/destinationSwitchRepository.js";
import { buildDestinationNotFoundPage, buildDestinationUnavailablePage } from "./destinationPageBuilder.js";
import { readDestinationRequestPath, resolveDestinationSiteOrigin } from "./destinationPageRequest.js";
import { DestinationTreeService } from "./destinationTreeService.js";

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
    this.now = now;
    this.renderTimeoutMs = renderTimeoutMs;
    this.switchState = null;
    this.switchRead = null;
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

  readSwitch() {
    if (this.switchState && this.now() < this.switchState.expiresAt) {
      return Promise.resolve(this.switchState.on);
    }
    this.switchRead ??= this.destinationSwitchRepository
      .isDestinationPagesSwitchOn()
      .then((on) => {
        this.switchState = { on, expiresAt: this.now() + DESTINATION_SWITCH_TTL_MS };
        return on;
      })
      .finally(() => {
        this.switchRead = null;
      });
    return this.switchRead;
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
