import { DestinationPageService } from "../business/service/destinationPageService.js";

const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
const NOT_FOUND_CACHE_CONTROL = "public, max-age=60";
const REDIRECT_CACHE_CONTROL = "public, max-age=3600";
const SITEMAP_CACHE_CONTROL = "public, max-age=300";
const UNAVAILABLE_RETRY_AFTER_SECONDS = "60";

const respond = (statusCode, headers, body) => ({
  statusCode,
  headers: { "Content-Type": HTML_CONTENT_TYPE, ...headers },
  body,
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
