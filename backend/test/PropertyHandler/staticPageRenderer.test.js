import { describe, it, expect, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { StaticPageRenderer } from "../../functions/PropertyHandler/business/service/staticPageRenderer.js";

const FIXTURES = join(process.cwd(), "prerender", "__fixtures__");
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
  it("renders the snapshot for the primary domain without price, availability or street address", async () => {
    const generator = buildGenerator();
    const snapshot = {
      ...SITE.publishedPropertySnapshot,
      calendarAvailability: { unavailableDateKeys: ["2026-12-24"] },
    };

    const html = await buildRenderer(generator).render({
      template: APP_SHELL,
      site: { ...SITE, publishedPropertySnapshot: snapshot },
      domain: DOMAIN,
    });

    const [{ propertyDetails }] = generator.buildWebsiteTemplateModel.mock.calls[0];
    expect(propertyDetails.property.title).toBe("Wellness Villa Bisous");
    expect(propertyDetails).not.toHaveProperty("pricing");
    expect(propertyDetails).not.toHaveProperty("calendarAvailability");
    expect(propertyDetails.location).toEqual({ country: "Indonesia", city: "Ubud" });
    const { template, renderPayload } = generator.buildStaticSiteDocument.mock.calls[0][0];
    expect(template).toBe(APP_SHELL);
    expect(renderPayload).toMatchObject({
      renderSource: "published_site",
      site: { id: SITE.id, templateKey: "panorama-landing", status: "PUBLISHED" },
      domain: DOMAIN,
      resolution: { siteId: SITE.id, domain: DOMAIN, isReachable: true },
      propertySnapshot: propertyDetails,
    });
    expect(html).toBe("<html>page</html>");
  });

  it("refuses a template the generator cannot build instead of uploading the bare shell", async () => {
    const generator = buildGenerator({ canBuildStaticSiteDocument: jest.fn(() => false) });

    await expect(buildRenderer(generator).render({ template: APP_SHELL, site: SITE, domain: DOMAIN })).rejects.toThrow(
      'The generator has no static page for template "panorama-landing".'
    );
    expect(generator.buildStaticSiteDocument).not.toHaveBeenCalled();
  });
});
