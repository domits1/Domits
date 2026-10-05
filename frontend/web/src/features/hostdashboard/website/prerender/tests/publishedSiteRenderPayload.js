const DEFAULT_SITE = Object.freeze({
  id: "bf378265-b563-4406-9c38-5232d8c1f7ae",
  propertyId: "ecd926d9-67dc-4d0a-9b40-2884d0838406",
  hostId: "dac2b1dc-c8e4-446b-b5d3-4d65646d7ed0",
  siteName: "Wellness Villa Bisous",
  primaryLocale: "en",
  status: "PUBLISHED",
  templateKey: "panorama-landing",
  publishedAt: 1782204057102,
});

const DEFAULT_DOMAIN = Object.freeze({
  domain: "wellness-villa-bisous-bf378265.direct.domits.com",
  status: "ACTIVE",
  isPrimary: true,
});

const buildResolution = (site, domain) => ({
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
});

export const buildPublishedSiteRenderPayload = ({
  propertySnapshot: propertySnapshotOverrides,
  contentOverrides: contentOverridesOverrides,
  site: siteOverrides,
  domain: domainOverrides,
  ...overrides
} = {}) => ({
  resolution: buildResolution(
    { ...DEFAULT_SITE, ...siteOverrides },
    { ...DEFAULT_DOMAIN, ...domainOverrides }
  ),
  site: { ...DEFAULT_SITE, ...siteOverrides },
  domain: { ...DEFAULT_DOMAIN, ...domainOverrides },
  propertySnapshot: {
    property: {
      id: "ecd926d9-67dc-4d0a-9b40-2884d0838406",
      hostId: "dac2b1dc-c8e4-446b-b5d3-4d65646d7ed0",
      title: "Wellness Villa Bisous",
      subtitle: "Private pool villa",
      description:
        "Escape to a serene four-bedroom private villa designed for space, comfort and a peaceful connection with nature.",
      status: "ACTIVE",
    },
    location: {
      country: "Indonesia",
      city: "Ubud",
      street: "Jalan Raya Sayan",
      houseNumber: "17",
      houseNumberExtension: "B",
      postalCode: "80571",
    },
    propertyType: { property_type: "House", spaceType: "Entire house" },
    pricing: { roomRate: 550, weekendRate: 550, cleaning: 0 },
    generalDetails: [
      { detail: "Guests", value: 8 },
      { detail: "Bedrooms", value: 4 },
      { detail: "Beds", value: 4 },
      { detail: "Bathrooms", value: 3 },
    ],
    availabilityRestrictions: [{ restriction: "MinimumStay", value: 2 }],
    amenities: [{ amenityId: "96" }, { amenityId: "12" }],
    rules: [{ rule: "smoking", value: false }],
    checkIn: { checkIn: { from: "15:00" }, checkOut: { till: "11:00" } },
    images: [
      { image_id: "first", sort_order: 0, status: "READY", web_key: "images/property/first/web.jpg" },
      { image_id: "second", sort_order: 1, status: "READY", web_key: "images/property/second/web.jpg" },
    ],
    hostProfile: { givenName: "Amara" },
    ...propertySnapshotOverrides,
  },
  contentOverrides: { heroEyebrow: "Entire house in Ubud, Indonesia", ...contentOverridesOverrides },
  themeOverrides: {},
  renderSource: "published_site",
  ...overrides,
});

export const APP_SHELL_TEMPLATE = [
  '<!doctype html><html lang="en"><head>',
  '<meta charset="utf-8" />',
  '<meta name="viewport" content="width=device-width,initial-scale=1" />',
  "<title>Domits - Holiday rentals, campers, boats and more...</title>",
  '<meta name="description" content="Book your next stay" />',
  '<link rel="stylesheet" href="/static/css/main.abc123.css" />',
  '</head><body><noscript>You need to enable JavaScript to run this app.</noscript>',
  '<div id="root"></div>',
  '<script defer src="/static/js/main.def456.js"></script>',
  "</body></html>",
].join("");
