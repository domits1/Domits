import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import { WebsiteTemplateSurface } from "../rendering/WebsiteTemplatePreview";
import WebsitePublicSitePage from "../WebsitePublicSitePage";

jest.mock("../rendering/booking/QuoteAvailabilitySection", () => ({
  __esModule: true,
  default: function QuoteAvailabilitySectionStub({ siteId }) {
    return <div data-testid="quote-availability" data-site-id={siteId} />;
  },
}));
jest.mock("../services/websitePublicSiteService", () => ({
  ...jest.requireActual("../services/websitePublicSiteService"),
  fetchPublicWebsiteRenderModel: jest.fn(),
}));
jest.mock("../services/websitePropertyService", () => ({
  enrichWebsitePropertyDetails: async (propertySnapshot) => propertySnapshot,
}));
jest.mock("../analytics/websiteAnalyticsService", () => ({
  recordPublicWebsiteAnalyticsEventSafely: async () => {},
}));

const { fetchPublicWebsiteRenderModel } = jest.requireMock("../services/websitePublicSiteService");

const ALL_PAGES_ON = Object.freeze({
  gallery: { enabled: true },
  accommodation: { enabled: true },
  contact: { enabled: true },
});
const SITE_ID = renderPayload.site.id;

const buildModel = ({
  propertyDetails = renderPayload.propertySnapshot,
  contentOverrides = renderPayload.contentOverrides,
  templateId = "panorama-landing",
} = {}) =>
  applyWebsiteDraftContentOverrides(
    buildWebsiteTemplateModel({ propertyDetails, summaryProperty: null }),
    contentOverrides,
    templateId
  );

const renderSite = ({ templateId = "panorama-landing", model = buildModel({ templateId }), activePageKey } = {}) =>
  render(
    <MemoryRouter>
      <WebsiteTemplateSurface
        templateId={templateId}
        model={model}
        showBrowserChrome={false}
        quoteContext={{ siteId: SITE_ID }}
        activePageKey={activePageKey}
      />
    </MemoryRouter>
  );

const readTopBarClasses = () => document.querySelector("[data-panorama-top-bar]")?.className.split(/\s+/) || [];

const expectEliteHomeWithAvailability = async () => {
  expect(document.querySelector("article.panoramaEliteHome")).not.toBeNull();
  expect(readTopBarClasses()).toContain("panoramaTopBarShellElite");
  expect(readTopBarClasses()).not.toContain("panoramaTopBarShellEliteLight");
  expect((await screen.findByTestId("quote-availability")).closest("#availability")).not.toBeNull();
  expect(screen.getByTestId("quote-availability")).toHaveAttribute("data-site-id", SITE_ID);
  expect(document.querySelectorAll("article > footer.eliteFooter")).toHaveLength(1);
};

describe("the Elite style of the home page of a site with one property", () => {
  it("styles the home page of a site with its own pages, with the availability section and its quote panel", async () => {
    const contentOverrides = { ...renderPayload.contentOverrides, sitePages: ALL_PAGES_ON };
    renderSite({ model: buildModel({ contentOverrides }), activePageKey: "main" });

    await expectEliteHomeWithAvailability();
  });

  it("styles the single page of a site without its own pages", async () => {
    renderSite();

    await expectEliteHomeWithAvailability();
    expect(document.querySelector("#about")).not.toBeNull();
  });

  it("keeps a site without photos and without a description complete", async () => {
    const { propertySnapshot } = renderPayload;
    const propertyDetails = {
      ...propertySnapshot,
      images: [],
      property: { ...propertySnapshot.property, description: "" },
    };
    renderSite({ model: buildModel({ propertyDetails, contentOverrides: {} }) });

    await expectEliteHomeWithAvailability();
    expect(document.querySelector("footer.eliteFooter")).toHaveTextContent(propertySnapshot.property.title);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(propertySnapshot.property.title);
    expect(document.querySelector("#overview .panoramaHeroOverlay")).not.toBeNull();
  });

  it.each(["accommodation", "gallery", "contact"])("leaves the restyled %s page as it is", (pageKey) => {
    const contentOverrides = { ...renderPayload.contentOverrides, sitePages: ALL_PAGES_ON };
    renderSite({ model: buildModel({ contentOverrides }), activePageKey: pageKey });

    expect(document.querySelector(`[data-elite-page="${pageKey}"]`)).not.toBeNull();
    expect(document.querySelector("article.panoramaEliteHome")).toBeNull();
    expect(document.querySelectorAll("footer.eliteFooter")).toHaveLength(1);
  });

  it.each(["trust-signals", "experience-journey"])("leaves the home page of the %s template alone", (templateId) => {
    renderSite({ templateId });

    expect(document.querySelector("article")).not.toBeNull();
    expect(document.querySelector(".panoramaEliteHome")).toBeNull();
    expect(document.querySelector(".panoramaTopBarShellElite")).toBeNull();
    expect(document.querySelector(".eliteFooter")).toBeNull();
  });
});

describe("the property page of an Elite website with its properties", () => {
  const SITE_HOST_PAYLOAD = { ...renderPayload, domain: { ...renderPayload.domain, domain: "localhost" } };
  const VILLA_B = {
    propertyId: "property-b",
    slug: "villa-b",
    isMainProperty: false,
    propertySnapshot: {
      property: { id: "property-b", title: "Villa B" },
      location: { city: "Canggu", country: "Indonesia" },
      images: [],
    },
  };
  const LIST_PAYLOAD = {
    ...SITE_HOST_PAYLOAD,
    siteProperties: [{ propertyId: renderPayload.site.propertyId, slug: "villa-a", isMainProperty: true }, VILLA_B],
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(globalThis, "scrollTo").mockImplementation(() => {});
    fetchPublicWebsiteRenderModel.mockResolvedValue(LIST_PAYLOAD);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  it.each(["/properties/villa-a", "/properties/villa-b"])(
    "gives %s one footer and leaves the home page style out",
    async (url) => {
      globalThis.history.replaceState(null, "", url);
      render(
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/*" element={<WebsitePublicSitePage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByRole("button", { name: "Check availability" })).toBeInTheDocument();
      expect(document.querySelector('[data-elite-page="property"]')).not.toBeNull();
      expect(document.querySelectorAll("footer.eliteFooter")).toHaveLength(1);
      expect(document.querySelector(".panoramaEliteHome")).toBeNull();
    }
  );
});
