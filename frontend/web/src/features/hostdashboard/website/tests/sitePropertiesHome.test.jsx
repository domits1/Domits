import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsitePublicSitePage from "../WebsitePublicSitePage";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import { applyWebsiteDraftThemeOverrides } from "../rendering/websiteDraftThemeOverrides";
import { WebsiteTemplateSurface } from "../rendering/WebsiteTemplatePreview";

jest.mock("../services/websitePublicSiteService", () => ({
  ...jest.requireActual("../services/websitePublicSiteService"),
  fetchPublicWebsiteRenderModel: jest.fn(),
}));
jest.mock("../services/websitePropertyService", () => ({
  enrichWebsitePropertyDetails: async (propertySnapshot) => propertySnapshot,
}));
jest.mock("../services/websitePreviewSync", () => ({
  WEBSITE_LIVE_SITE_UPDATE_MESSAGE_TYPE: "website-live-site-update",
  subscribeToWebsiteLiveSiteUpdates: () => () => {},
}));
jest.mock("../analytics/websiteAnalyticsService", () => ({
  recordPublicWebsiteAnalyticsEventSafely: async () => {},
}));
jest.mock("../analytics/websitePreviewAnalytics", () => ({
  getWebsiteAnalyticsViewport: () => "desktop",
  startWebsitePreviewLcpObserver: () => () => {},
}));
jest.mock("../rendering/booking/QuoteAvailabilitySection", () => ({
  __esModule: true,
  default: function QuoteAvailabilitySectionStub({ siteId }) {
    return <div data-testid="quote-availability" data-site-id={siteId} />;
  },
}));

const { fetchPublicWebsiteRenderModel } = jest.requireMock("../services/websitePublicSiteService");

const SITE_ID = renderPayload.site.id;
const SITE_DOMAIN = renderPayload.domain.domain;
const SITE_HOST_PAYLOAD = { ...renderPayload, domain: { ...renderPayload.domain, domain: "localhost" } };
const MAIN_PROPERTY = { propertyId: renderPayload.site.propertyId, slug: "villa-a", isMainProperty: true };
const VILLA_B = {
  propertyId: "property-b",
  slug: "villa-b",
  isMainProperty: false,
  propertySnapshot: {
    property: { id: "property-b", title: "Villa B" },
    location: { city: "Canggu", country: "Indonesia" },
    generalDetails: [
      { detail: "Guests", value: 4 },
      { detail: "Bedrooms", value: 2 },
    ],
    images: [{ image_id: "image-b", sort_order: 0, status: "READY", web_key: "images/property-b/image-b/web.jpg" }],
  },
};

const withSiteProperties = (payload, siteProperties) => ({ ...payload, siteProperties });

const buildModel = (payload) =>
  applyWebsiteDraftContentOverrides(
    applyWebsiteDraftThemeOverrides(
      buildWebsiteTemplateModel({ propertyDetails: payload.propertySnapshot, summaryProperty: null }),
      payload.themeOverrides
    ),
    payload.contentOverrides,
    payload.site.templateKey
  );

const renderTodaysHomeHtml = async ({ pageBasePath = "", pageSearch = "" } = {}) => {
  const model = buildModel(renderPayload);
  const { container, unmount } = render(
    <MemoryRouter>
      <WebsiteTemplateSurface
        templateId={renderPayload.site.templateKey}
        model={model}
        showContactWidget={model.visibility?.chatWidget ?? true}
        showBrowserChrome={false}
        enableScrollReveal
        quoteContext={{ siteId: SITE_ID }}
        pageBasePath={pageBasePath}
        pageSearch={pageSearch}
      />
    </MemoryRouter>
  );
  await screen.findByTestId("quote-availability");
  const html = container.innerHTML;
  unmount();
  return html;
};

const renderSiteAt = (url) => {
  globalThis.history.replaceState(null, "", url);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/website-live/:domain/*" element={<WebsitePublicSitePage />} />
        <Route path="/*" element={<WebsitePublicSitePage />} />
      </Routes>
    </MemoryRouter>
  );
};

const readSiteHtml = async () => {
  await screen.findByTestId("quote-availability");
  return document.querySelector(".publicPreviewCanvas").innerHTML;
};

beforeEach(() => {
  global.fetch = jest.fn();
  jest.spyOn(globalThis, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
  globalThis.history.replaceState(null, "", "/");
});

describe("the home page of a site without a usable list of properties", () => {
  const SITES = [
    ["without a list", (payload) => payload],
    ["with an empty list", (payload) => withSiteProperties(payload, [])],
    [
      "with a stale list in its overrides",
      (payload) => ({
        ...payload,
        contentOverrides: { ...payload.contentOverrides, siteProperties: [MAIN_PROPERTY, VILLA_B] },
      }),
    ],
    [
      "with one usable property left",
      (payload) => withSiteProperties(payload, [MAIN_PROPERTY, { ...VILLA_B, propertySnapshot: null }]),
    ],
    [
      "with two entries of one slug",
      (payload) => withSiteProperties(payload, [MAIN_PROPERTY, { ...VILLA_B, slug: "villa-a" }]),
    ],
  ];

  it.each(SITES)("renders the home page of a site %s as today, without a quote request", async (_, arrange) => {
    fetchPublicWebsiteRenderModel.mockResolvedValue(arrange(SITE_HOST_PAYLOAD));
    const todaysHtml = await renderTodaysHomeHtml();

    renderSiteAt("/");

    expect(await readSiteHtml()).toBe(todaysHtml);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(SITES)("renders the live view home page of a site %s as today", async (_, arrange) => {
    fetchPublicWebsiteRenderModel.mockResolvedValue(arrange(renderPayload));
    const todaysHtml = await renderTodaysHomeHtml({
      pageBasePath: `/website-live/${SITE_DOMAIN}`,
      pageSearch: `?siteId=${SITE_ID}`,
    });

    renderSiteAt(`/website-live/${SITE_DOMAIN}?siteId=${SITE_ID}`);

    expect(await readSiteHtml()).toBe(todaysHtml);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
