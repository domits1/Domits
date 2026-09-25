import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import WebsitePublicSitePage from "../WebsitePublicSitePage";
import { PublicWebsiteRequestError } from "../services/websitePublicSiteService";

jest.mock("../services/websitePublicSiteService", () => ({
  ...jest.requireActual("../services/websitePublicSiteService"),
  fetchPublicWebsiteRenderModel: jest.fn(),
}));

jest.mock("../services/websitePropertyService", () => ({
  enrichWebsitePropertyDetails: jest.fn(async (propertySnapshot) => propertySnapshot),
}));

jest.mock("../services/websitePreviewSync", () => ({
  WEBSITE_LIVE_SITE_UPDATE_MESSAGE_TYPE: "website-live-site-update",
  subscribeToWebsiteLiveSiteUpdates: jest.fn(() => () => {}),
}));

jest.mock("../analytics/websiteAnalyticsService", () => ({
  recordPublicWebsiteAnalyticsEventSafely: jest.fn(async () => {}),
}));

jest.mock("../analytics/websitePreviewAnalytics", () => ({
  getWebsiteAnalyticsViewport: jest.fn(() => "desktop"),
  startWebsitePreviewLcpObserver: jest.fn(() => () => {}),
}));

jest.mock("../rendering/templateRegistry", () => ({
  getWebsiteTemplateRenderer: jest.fn(() => function TemplateStub() {
    return null;
  }),
}));

jest.mock("../rendering/WebsiteTemplatePreview", () => ({
  WebsiteTemplateSurface: function WebsiteTemplateSurfaceStub() {
    return <div data-testid="published-site" />;
  },
}));

const { fetchPublicWebsiteRenderModel } = jest.requireMock("../services/websitePublicSiteService");
const { enrichWebsitePropertyDetails } = jest.requireMock("../services/websitePropertyService");
const { subscribeToWebsiteLiveSiteUpdates } = jest.requireMock("../services/websitePreviewSync");
const { getWebsiteTemplateRenderer } = jest.requireMock("../rendering/templateRegistry");

function TemplateStub() {
  return null;
}

const MARKETPLACE_TITLE = "Domits - Holiday rentals, campers, boats and more...";
const MARKETPLACE_DESCRIPTION = "Explore the perfect holiday rental on Domits.";

const buildRenderPayload = ({ domain = globalThis.location.host, siteId = "site-1" } = {}) => ({
  resolution: { siteId, templateKey: "panorama-landing" },
  site: { id: siteId, siteName: "Wellness Villa Bisous", templateKey: "panorama-landing" },
  domain: { domain, isPrimary: true },
  propertySnapshot: {
    property: {
      id: "property-1",
      title: "Wellness Villa Bisous",
      subtitle: "Subtitle copy that no template renders.",
      description: "A serene four bedroom villa with a private pool.",
    },
    location: {
      city: "Ubud",
      country: "Indonesia",
      street: "Jl. Ir. Sutami, Kemenuh",
      postalCode: "80581",
    },
    images: [{ image_id: "image-1", key: "images/property-1/image-1/web.jpg", status: "READY" }],
  },
  contentOverrides: {},
  themeOverrides: {},
  renderSource: "published_site",
});

const readMetaContent = (attributeName, attributeValue) =>
  document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`)?.getAttribute("content") ?? null;

const renderPage = () => render(<WebsitePublicSitePage />, { wrapper: MemoryRouter });

const NavigateToSiteB = () => {
  const navigate = useNavigate();

  return (
    <button type="button" data-testid="go-to-site-b" onClick={() => navigate("/website-live/villa-b.example.com")}>
      go
    </button>
  );
};

const renderPageOnLiveRoute = () =>
  render(
    <MemoryRouter initialEntries={["/website-live/villa-a.example.com"]}>
      <Routes>
        <Route
          path="/website-live/:domain"
          element={
            <>
              <WebsitePublicSitePage />
              <NavigateToSiteB />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("WebsitePublicSitePage head tags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enrichWebsitePropertyDetails.mockImplementation(async (propertySnapshot) => propertySnapshot);
    subscribeToWebsiteLiveSiteUpdates.mockImplementation(() => () => {});
    getWebsiteTemplateRenderer.mockImplementation(() => TemplateStub);
    process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE = "true";

    document.head.innerHTML = "";
    document.title = MARKETPLACE_TITLE;

    const descriptionElement = document.createElement("meta");
    descriptionElement.setAttribute("name", "description");
    descriptionElement.setAttribute("content", MARKETPLACE_DESCRIPTION);
    document.head.append(descriptionElement);
  });

  afterEach(() => {
    delete process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE;
  });

  it("writes the site tags once the published site loads", async () => {
    fetchPublicWebsiteRenderModel.mockResolvedValue(buildRenderPayload());

    renderPage();

    await screen.findByTestId("published-site");

    expect(document.title).toBe("Wellness Villa Bisous | Ubud, Indonesia");
    expect(readMetaContent("name", "description")).toBe("A serene four bedroom villa with a private pool.");
    expect(readMetaContent("property", "og:title")).toBe("Wellness Villa Bisous | Ubud, Indonesia");
    expect(readMetaContent("property", "og:type")).toBe("website");
    expect(readMetaContent("property", "og:image")).toContain("images/property-1/image-1/web.jpg");
    expect(readMetaContent("property", "og:image:alt")).toBe("Wellness Villa Bisous | Ubud, Indonesia");
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("never exposes the street or postal code in the head", async () => {
    fetchPublicWebsiteRenderModel.mockResolvedValue(buildRenderPayload());

    renderPage();

    await screen.findByTestId("published-site");

    expect(document.head.innerHTML).not.toContain("Sutami");
    expect(document.head.innerHTML).not.toContain("80581");
    expect(document.title).not.toContain("Sutami");
  });

  it("marks a website that does not exist as noindex", async () => {
    fetchPublicWebsiteRenderModel.mockRejectedValue(
      new PublicWebsiteRequestError("Published website not found.", 404)
    );

    renderPage();

    await waitFor(() => {
      expect(readMetaContent("name", "robots")).toBe("noindex, nofollow");
    });
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
  });

  it("does not mark a server failure as noindex", async () => {
    fetchPublicWebsiteRenderModel.mockRejectedValue(
      new PublicWebsiteRequestError("We could not load this published website.", 500)
    );

    renderPage();

    await screen.findByText("We could not load this published website.");

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("does not mark a network failure as noindex", async () => {
    fetchPublicWebsiteRenderModel.mockRejectedValue(new TypeError("Failed to fetch"));

    renderPage();

    await screen.findByText("Failed to fetch");

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("does not mark an enrichment failure as noindex", async () => {
    fetchPublicWebsiteRenderModel.mockResolvedValue(buildRenderPayload());
    enrichWebsitePropertyDetails.mockRejectedValue(new Error("Enrichment failed."));

    renderPage();

    await screen.findByText("Enrichment failed.");

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("never marks the page as noindex while it is still loading", async () => {
    let resolveRenderModel = () => {};
    fetchPublicWebsiteRenderModel.mockReturnValue(
      new Promise((resolve) => {
        resolveRenderModel = resolve;
      })
    );

    renderPage();

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.title).toBe(MARKETPLACE_TITLE);

    resolveRenderModel(buildRenderPayload());
    await screen.findByTestId("published-site");
  });

  it("always marks the marketplace live view as noindex without open graph tags", async () => {
    delete process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE;
    fetchPublicWebsiteRenderModel.mockResolvedValue(buildRenderPayload());

    renderPage();

    expect(readMetaContent("name", "robots")).toBe("noindex, nofollow");
    expect(document.title).toBe(MARKETPLACE_TITLE);

    await screen.findByTestId("published-site");

    expect(readMetaContent("name", "robots")).toBe("noindex, nofollow");
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull();
    expect(readMetaContent("name", "description")).toBe(MARKETPLACE_DESCRIPTION);
  });

  it("drops noindex as soon as a retry starts and does not bring it back on success", async () => {
    fetchPublicWebsiteRenderModel.mockRejectedValueOnce(
      new PublicWebsiteRequestError("Published website not found.", 404)
    );

    renderPage();

    await waitFor(() => {
      expect(readMetaContent("name", "robots")).toBe("noindex, nofollow");
    });

    let resolveRetry = () => {};
    fetchPublicWebsiteRenderModel.mockReturnValue(
      new Promise((resolve) => {
        resolveRetry = resolve;
      })
    );

    await act(async () => {
      globalThis.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "website-live-site-update", domain: globalThis.location.host },
        })
      );
    });

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();

    await act(async () => {
      resolveRetry(buildRenderPayload());
    });
    await screen.findByTestId("published-site");

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(readMetaContent("property", "og:title")).toBe("Wellness Villa Bisous | Ubud, Indonesia");
    expect(document.title).toBe("Wellness Villa Bisous | Ubud, Indonesia");
  });

  it("drops site A's tags as soon as the route asks for site B", async () => {
    fetchPublicWebsiteRenderModel.mockResolvedValueOnce(
      buildRenderPayload({ domain: "villa-a.example.com", siteId: "site-a" })
    );

    renderPageOnLiveRoute();
    await screen.findByTestId("published-site");

    expect(readMetaContent("property", "og:title")).toBe("Wellness Villa Bisous | Ubud, Indonesia");

    fetchPublicWebsiteRenderModel.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      fireEvent.click(screen.getByTestId("go-to-site-b"));
    });

    expect(document.title).toBe(MARKETPLACE_TITLE);
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull();
    expect(readMetaContent("name", "description")).toBe(MARKETPLACE_DESCRIPTION);
  });

  it("restores the marketplace head when the page unmounts", async () => {
    fetchPublicWebsiteRenderModel.mockResolvedValue(buildRenderPayload());

    const { unmount } = renderPage();
    await screen.findByTestId("published-site");

    unmount();

    expect(document.title).toBe(MARKETPLACE_TITLE);
    expect(readMetaContent("name", "description")).toBe(MARKETPLACE_DESCRIPTION);
    expect(document.head.querySelectorAll("meta")).toHaveLength(1);
  });
});
