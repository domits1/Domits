const RENDER_SOURCE = "published_site";
const LIVE_SNAPSHOT_KEYS = ["pricing", "calendarAvailability"];
const PRIVATE_LOCATION_KEYS = ["street", "houseNumber", "houseNumberExtension", "postalCode"];
const PUBLIC_SITE_KEYS = "id propertyId hostId siteName primaryLocale status templateKey publishedAt".split(" ");

const withoutKeys = (object, keys) =>
  Object.fromEntries(Object.entries(object || {}).filter(([key]) => !keys.includes(key)));

const stripLiveAndPrivateDetails = (snapshot) => {
  const publicSnapshot = withoutKeys(snapshot, LIVE_SNAPSHOT_KEYS);
  if (publicSnapshot.location && typeof publicSnapshot.location === "object") {
    publicSnapshot.location = withoutKeys(publicSnapshot.location, PRIVATE_LOCATION_KEYS);
  }

  return publicSnapshot;
};

const buildRenderDomain = ({ mainAddress, destination }) =>
  mainAddress ? { ...mainAddress, isPrimary: true } : { ...destination, isPrimary: false };

const buildRenderPayload = ({ site, domain }) => ({
  resolution: {
    siteId: site.id,
    propertyId: site.propertyId,
    hostId: site.hostId,
    templateKey: site.templateKey,
    primaryLocale: site.primaryLocale,
    siteName: site.siteName,
    siteStatus: site.status,
    publishedAt: site.publishedAt,
    isReachable: site.status === "PUBLISHED" && domain.status === "ACTIVE",
    domain,
  },
  site: Object.fromEntries(PUBLIC_SITE_KEYS.map((key) => [key, site[key]])),
  domain,
  propertySnapshot: stripLiveAndPrivateDetails(site.publishedPropertySnapshot),
  contentOverrides: site.publishedContentOverrides || {},
  themeOverrides: site.publishedThemeOverrides || {},
  renderSource: RENDER_SOURCE,
});

export class StaticPageRenderer {
  constructor({ loadGenerator = () => import("../../generated/staticPageBundle.mjs") } = {}) {
    this.loadGenerator = loadGenerator;
    this.generator = null;
  }

  async render({ template, site, mainAddress, destination }) {
    const generator = await this.#generator();
    const renderPayload = buildRenderPayload({ site, domain: buildRenderDomain({ mainAddress, destination }) });
    if (!generator.canBuildStaticSiteDocument(renderPayload)) {
      throw new Error(`The generator has no static page for template "${site.templateKey}".`);
    }

    const baseModel = generator.buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot });
    const themedModel = generator.applyWebsiteDraftThemeOverrides(baseModel, renderPayload.themeOverrides);
    const model = generator.applyWebsiteDraftContentOverrides(
      themedModel,
      renderPayload.contentOverrides,
      site.templateKey
    );
    return generator.buildStaticSiteDocument({ template, renderPayload, model });
  }

  async #generator() {
    if (!this.generator) {
      this.generator = await this.loadGenerator();
    }

    return this.generator;
  }
}

export default StaticPageRenderer;
