import { describe, it, expect, jest } from "@jest/globals";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { StaticPageRenderer } from "../../functions/PropertyHandler/business/service/staticPageRenderer.js";

const FIXTURES = join(process.cwd(), "prerender", "__fixtures__");
const BUNDLE = join(process.cwd(), "functions", "PropertyHandler", "generated", "staticPageBundle.mjs");
const FIXTURE_PAYLOAD = JSON.parse(readFileSync(join(FIXTURES, "renderPayload.json"), "utf8"));
const APP_SHELL = readFileSync(join(FIXTURES, "appShell.html"), "utf8");

const SITE = {
  ...FIXTURE_PAYLOAD.site,
  publishedPropertySnapshot: FIXTURE_PAYLOAD.propertySnapshot,
  publishedContentOverrides: FIXTURE_PAYLOAD.contentOverrides,
  publishedThemeOverrides: FIXTURE_PAYLOAD.themeOverrides,
  staticPageRevision: 4,
};
const DOMAIN = FIXTURE_PAYLOAD.domain;

const buildGenerator = (overrides = {}) => ({
  canBuildStaticSiteDocument: jest.fn(() => true),
  buildWebsiteTemplateModel: jest.fn(() => ({ step: "base" })),
  applyWebsiteDraftThemeOverrides: jest.fn((model) => ({ ...model, step: "themed" })),
  applyWebsiteDraftContentOverrides: jest.fn((model) => ({ ...model, step: "content" })),
  buildStaticSiteDocument: jest.fn(() => "<html>page</html>"),
  ...overrides,
});

const buildRenderer = (generator) => new StaticPageRenderer({ loadGenerator: jest.fn(async () => generator) });

describe("StaticPageRenderer", () => {
  it("renders from the published snapshot and the primary domain, never from a live lookup", async () => {
    const generator = buildGenerator();

    const html = await buildRenderer(generator).render({ template: APP_SHELL, site: SITE, domain: DOMAIN });

    const [{ propertyDetails }] = generator.buildWebsiteTemplateModel.mock.calls[0];
    expect(propertyDetails.property.title).toBe("Wellness Villa Bisous");
    const { renderPayload } = generator.buildStaticSiteDocument.mock.calls[0][0];
    expect(renderPayload).toMatchObject({
      renderSource: "published_site",
      site: { id: SITE.id, templateKey: "panorama-landing", status: "PUBLISHED" },
      domain: DOMAIN,
      resolution: { siteId: SITE.id, domain: DOMAIN, isReachable: true },
    });
    expect(generator.buildStaticSiteDocument.mock.calls[0][0].template).toBe(APP_SHELL);
    expect(html).toBe("<html>page</html>");
  });

  it("strips the price, the availability and the street address before the generator sees the snapshot", async () => {
    const generator = buildGenerator();
    const site = {
      ...SITE,
      publishedPropertySnapshot: {
        ...SITE.publishedPropertySnapshot,
        calendarAvailability: { unavailableDateKeys: ["2026-12-24"] },
      },
    };

    await buildRenderer(generator).render({ template: APP_SHELL, site, domain: DOMAIN });

    const [{ propertyDetails }] = generator.buildWebsiteTemplateModel.mock.calls[0];
    expect(propertyDetails).not.toHaveProperty("pricing");
    expect(propertyDetails).not.toHaveProperty("calendarAvailability");
    expect(propertyDetails.location).toEqual({ country: "Indonesia", city: "Ubud" });
    expect(generator.buildStaticSiteDocument.mock.calls[0][0].renderPayload.propertySnapshot).toBe(propertyDetails);
  });

  it("applies the theme overrides before the content overrides, with the site's template key", async () => {
    const generator = buildGenerator();

    await buildRenderer(generator).render({ template: APP_SHELL, site: SITE, domain: DOMAIN });

    expect(generator.applyWebsiteDraftThemeOverrides).toHaveBeenCalledWith({ step: "base" }, SITE.publishedThemeOverrides);
    expect(generator.applyWebsiteDraftContentOverrides).toHaveBeenCalledWith(
      { step: "themed" },
      SITE.publishedContentOverrides,
      "panorama-landing"
    );
    expect(generator.buildStaticSiteDocument.mock.calls[0][0].model).toEqual({ step: "content" });
  });

  it("refuses a template the generator cannot build instead of uploading the bare shell", async () => {
    const generator = buildGenerator({ canBuildStaticSiteDocument: jest.fn(() => false) });

    await expect(buildRenderer(generator).render({ template: APP_SHELL, site: SITE, domain: DOMAIN })).rejects.toThrow(
      'The generator has no static page for template "panorama-landing".'
    );
    expect(generator.buildStaticSiteDocument).not.toHaveBeenCalled();
  });

  it.each([
    ["street", "<html>Jalan Raya Sayan 17B</html>"],
    ["postal code", "<html>Ubud 80571</html>"],
  ])("refuses a page that leaks the %s, so a generator regression cannot publish it", async (_label, leakingPage) => {
    const generator = buildGenerator({ buildStaticSiteDocument: jest.fn(() => leakingPage) });

    await expect(buildRenderer(generator).render({ template: APP_SHELL, site: SITE, domain: DOMAIN })).rejects.toThrow(
      "The rendered page carries a private address detail."
    );
  });

  it("loads the bundled generator once and reuses it for every page", async () => {
    const loadGenerator = jest.fn(async () => buildGenerator());
    const renderer = new StaticPageRenderer({ loadGenerator });

    await renderer.render({ template: APP_SHELL, site: SITE, domain: DOMAIN });
    await renderer.render({ template: APP_SHELL, site: SITE, domain: DOMAIN });

    expect(loadGenerator).toHaveBeenCalledTimes(1);
  });

  (existsSync(BUNDLE) ? it : it.skip)("produces the golden page through the real bundle", async () => {
    const html = await new StaticPageRenderer().render({ template: APP_SHELL, site: SITE, domain: DOMAIN });

    expect(html).toBe(readFileSync(join(FIXTURES, "staticPage.html"), "utf8"));
  });
});
