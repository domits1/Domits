import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsitePublicSitePage from "../WebsitePublicSitePage";
import WebsiteTemplatePreview from "../rendering/WebsiteTemplatePreview";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";

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
  default: function QuoteAvailabilitySectionStub() {
    return null;
  },
}));

const { fetchPublicWebsiteRenderModel } = jest.requireMock("../services/websitePublicSiteService");

const CONTACT_PAGE_ON = Object.freeze({ contact: { enabled: true } });

const withContactPage = (fields = {}) => ({
  ...renderPayload,
  contentOverrides: { ...renderPayload.contentOverrides, sitePages: CONTACT_PAGE_ON },
  ...fields,
});

const openSitePath = async (path, payload) => {
  fetchPublicWebsiteRenderModel.mockResolvedValue(payload);
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<WebsitePublicSitePage />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText("Hosted by");
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the Contact us page of a site that cannot receive messages", () => {
  it.each([
    ["without the field", {}],
    ["with false", { acceptsContactMessages: false }],
    ["with the text true", { acceptsContactMessages: "true" }],
  ])("shows today's contact content only, %s", async (_label, fields) => {
    await openSitePath("/contact-us", withContactPage(fields));

    expect(screen.getByRole("heading", { level: 1, name: "Contact us" })).toBeInTheDocument();
    expect(document.querySelector("form")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("the editor preview of the Contact us page", () => {
  it("shows no form", () => {
    const model = applyWebsiteDraftContentOverrides(
      buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot, summaryProperty: null }),
      { ...renderPayload.contentOverrides, sitePages: CONTACT_PAGE_ON },
      "panorama-landing"
    );

    render(
      <MemoryRouter>
        <WebsiteTemplatePreview
          templateId="panorama-landing"
          model={model}
          onSelectTarget={jest.fn()}
          activeTargetId=""
          activePageKey="contact"
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Hosted by")).toBeInTheDocument();
    expect(document.querySelector("form")).toBeNull();
  });
});
