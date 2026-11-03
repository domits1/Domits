import { DestinationPageService } from "../business/service/destinationPageService.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
const NOT_FOUND_CACHE_CONTROL = "public, max-age=60";
const REDIRECT_CACHE_CONTROL = "public, max-age=3600";
const SITEMAP_CACHE_CONTROL = "public, max-age=300";
const UNAVAILABLE_RETRY_AFTER_SECONDS = "60";
const MENU_CACHE_CONTROL = "public, max-age=300";
const MENU_OFF_CACHE_CONTROL = "public, max-age=60";
const EMPTY_MENU = { continents: [] };
const UNAVAILABLE_MENU = { message: "Destinations are not available right now." };

const respond = (statusCode, headers, body) => ({
  statusCode,
  headers: { "Content-Type": HTML_CONTENT_TYPE, ...headers },
  body,
});

const respondJson = (statusCode, cacheControl, body, headers = {}) => ({
  statusCode,
  headers: { ...responseHeaders, "Content-Type": "application/json", "Cache-Control": cacheControl, ...headers },
  body: JSON.stringify(body),
});

export class DestinationPageController {
  constructor(destinationPageService = new DestinationPageService()) {
    this.destinationPageService = destinationPageService;
  }

  async getDestinationPage(event) {
    return this.toResponse(await this.destinationPageService.serve({ path: event?.path }));
  }

  async getDestinationSitemap() {
    return this.toResponse(await this.destinationPageService.serveSitemap());
  }

  async getDestinationMenu() {
    const outcome = await this.destinationPageService.serveMenu();
    switch (outcome.kind) {
      case "menu":
        return respondJson(200, MENU_CACHE_CONTROL, outcome.menu);
      case "menu_off":
        return respondJson(200, MENU_OFF_CACHE_CONTROL, EMPTY_MENU);
      default:
        return respondJson(503, "no-store", UNAVAILABLE_MENU, { "Retry-After": UNAVAILABLE_RETRY_AFTER_SECONDS });
    }
  }

  toResponse(outcome) {
    switch (outcome.kind) {
      case "sitemap":
        return respond(200, { "Content-Type": "application/xml", "Cache-Control": SITEMAP_CACHE_CONTROL }, outcome.xml);
      case "page":
        return respond(200, { "Cache-Control": outcome.cacheControl }, outcome.html);
      case "redirect":
        return respond(301, { "Cache-Control": REDIRECT_CACHE_CONTROL, Location: outcome.location }, "");
      case "unavailable":
        return respond(
          503,
          { "Cache-Control": "no-store", "Retry-After": UNAVAILABLE_RETRY_AFTER_SECONDS },
          outcome.html
        );
      default:
        return respond(404, { "Cache-Control": NOT_FOUND_CACHE_CONTROL }, outcome.html);
    }
  }
}
