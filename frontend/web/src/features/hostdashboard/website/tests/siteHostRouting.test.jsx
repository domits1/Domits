import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import App from "../../../../App";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import { applyWebsiteDraftThemeOverrides } from "../rendering/websiteDraftThemeOverrides";
import { WebsiteTemplateSurface } from "../rendering/WebsiteTemplatePreview";

function mockPage(name) {
  return function MockPage() {
    return name;
  };
}

function mockPassThrough({ children }) {
  return children;
}

jest.mock("@apollo/client", () => ({
  ApolloClient: function ApolloClient() {},
  ApolloProvider: mockPassThrough,
  HttpLink: function HttpLink() {},
  InMemoryCache: function InMemoryCache() {},
}));
jest.mock("react-modal", () => ({ __esModule: true, default: { setAppElement: () => {} } }));
jest.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));
jest.mock("@stripe/react-stripe-js", () => ({ Elements: mockPassThrough }));
jest.mock("../../../auth/AuthContext", () => ({ AuthProvider: mockPassThrough }));
jest.mock("../../../auth/UserContext", () => ({ UserProvider: mockPassThrough }));
jest.mock("../../../auth/guestauth/GuestProtectedRoute", () => mockPassThrough);
jest.mock("../../../auth/hostauth/HostProtectedRoute", () => mockPassThrough);
jest.mock("../../../../utils/userAttributes", () => ({ initializeUserAttributes: () => {} }));
jest.mock("../../../../components/base/Footer", () => mockPage("Domits footer"));
jest.mock("../../../../components/base/Header", () => mockPage("Domits header"));
jest.mock("../../../../components/base/navbar", () => mockPage("Domits navbar"));
jest.mock("../../../auth/Login", () => mockPage("Domits login page"));
jest.mock("../../../auth/Register", () => mockPage("Domits register page"));
jest.mock("../../../auth/confirmEmail/ConfirmEmailView.js", () => mockPage("Domits confirm email page"));
jest.mock("../../../bookingengine/listingdetails/pages/listingDetails2", () => mockPage("Domits listing page"));
jest.mock("../../../bookingengine/BookingOverview", () => mockPage("Domits booking overview"));
jest.mock("../../../bookingengine/BookingSend", () => mockPage("Domits booking send"));
jest.mock("../../../bookingengine/ValidatePayment", () => mockPage("Domits validate payment"));
jest.mock("../../../bookingengine/BookingConfirmOverview", () => mockPage("Domits booking confirmation"));
jest.mock("../../../chatwidget/ChatWidget", () => mockPage("Domits chat widget"));
jest.mock("../../../guestaiagent/EmployeeChat", () => mockPage("Domits employee chat"));
jest.mock("../../mainDashboardHost.js", () => mockPage("Domits host dashboard"));
jest.mock("../../../guestdashboard/mainDashboardGuest", () => mockPage("Domits guest dashboard"));
jest.mock("../../../review/views/ReviewPage", () => mockPage("Domits review page"));
jest.mock("../../../stripe/StripeCallback", () => mockPage("Domits stripe callback"));
jest.mock("../../../sustainability/Sustainability", () => mockPage("Domits sustainability page"));
jest.mock("../../../verification/hostverification/HostVerification.js", () => mockPage("Domits verify page"));
jest.mock("../../../verification/hostverification/HostVerifyPhoneNumber.js", () => mockPage("Domits phone page"));
jest.mock("../../../verification/hostverification/HostVerifyPhoneNumberConfirm.js", () =>
  mockPage("Domits phone confirm page")
);
jest.mock("../../AcceptInvite", () => mockPage("Domits accept invite page"));
jest.mock("../WebsitePublicPreviewPage.jsx", () => mockPage("Domits website preview page"));
jest.mock("../../../../pages/about/About", () => mockPage("Domits about page"));
jest.mock("../../../../pages/about/Team", () => mockPage("Domits team page"));
jest.mock("../../../../pages/careers/Careers", () => mockPage("Domits careers page"));
jest.mock("../../../../pages/careers/jobDetails.js", () => mockPage("Domits job page"));
jest.mock("../../../../pages/contact/Contact", () => mockPage("Domits contact page"));
jest.mock("../../../../pages/datasafety/datasafety.js", () => mockPage("Domits data safety page"));
jest.mock("../../../../pages/disclaimers/Disclaimers", () => mockPage("Domits disclaimers page"));
jest.mock("../../../../pages/helpdesk/Helpdesk.js", () => mockPage("Domits helpdesk page"));
jest.mock("../../../../pages/home/Accommodations", () => mockPage("Domits accommodations page"));
jest.mock("../../../../pages/home/homePage.js", () => mockPage("Domits home page"));
jest.mock("../../../../pages/howitworks/Howitworks.js", () => mockPage("Domits how it works page"));
jest.mock("../../../../pages/landingpage/Landing", () => mockPage("Domits landing page"));
jest.mock("../../../../pages/policy/Policy", () => mockPage("Domits policy page"));
jest.mock("../../../../pages/productupdates/ReleaseUpdates.js", () => mockPage("Domits release page"));
jest.mock("../../../../pages/terms/Terms", () => mockPage("Domits terms page"));
jest.mock("../../../../pages/travelinnovationlab/travelinnovation", () => mockPage("Domits innovation page"));
jest.mock("../../../../pages/whydomits/Whydomitstwo.js", () => mockPage("Domits why page"));
jest.mock("../../../../pages/Performance/performance", () => mockPage("Domits performance page"));
jest.mock("../../../../pages/security/security", () => mockPage("Domits security page"));
jest.mock("../../../../pages/channelmanager/Channelmanager.js", () => mockPage("Domits channel manager page"));
jest.mock("../../../../pages/adminproperty/AdminProperty.js", () => mockPage("Domits admin property page"));

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

jest.mock("../rendering/templates/PanoramaLandingTemplate", () => {
  const { createElement } = jest.requireActual("react");
  const { default: PanoramaLandingTemplate } = jest.requireActual("../rendering/templates/PanoramaLandingTemplate");
  return {
    __esModule: true,
    default: function RecordedPanoramaLandingTemplate(props) {
      mockTemplateProps.push(props);
      return createElement(PanoramaLandingTemplate, props);
    },
  };
});

const mockTemplateProps = [];
const { fetchPublicWebsiteRenderModel, PublicWebsiteRequestError } = jest.requireMock(
  "../services/websitePublicSiteService"
);

const SITE_DOMAIN = renderPayload.domain.domain;
const SITE_ID = renderPayload.site.id;
const SITE_TITLE = "Wellness Villa Bisous | Ubud, Indonesia";
const NOT_FOUND_TEXT = "The page you were looking for does not exist or has been removed";
const INDEX_TITLE = "Domits - Holiday rentals, campers, boats and more...";
const SITE_HOST_PAYLOAD = { ...renderPayload, domain: { ...renderPayload.domain, domain: "localhost" } };
const GALLERY_AND_CONTACT_ON = { gallery: { enabled: true }, contact: { enabled: true, navLabel: "Reach us" } };

const withSitePages = (payload, sitePages) => ({
  ...payload,
  contentOverrides: { ...payload.contentOverrides, sitePages },
});

const lastTemplateProps = () => mockTemplateProps.at(-1);

const listSectionIds = () =>
  Array.from(document.querySelectorAll(".publicPreviewCanvas article > section[id]")).map((section) => section.id);

const getTopMenu = () => document.querySelector(".templateTopBarNav");

const placeAvailabilityAt = (top) =>
  jest.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function placeElement() {
    return { top: this.id === "availability" ? top : 0, height: 0 };
  });

const listSmoothScrolls = () => globalThis.scrollTo.mock.calls.filter(([options]) => typeof options === "object");

const buildModel = (payload) =>
  applyWebsiteDraftContentOverrides(
    applyWebsiteDraftThemeOverrides(
      buildWebsiteTemplateModel({ propertyDetails: payload.propertySnapshot, summaryProperty: null }),
      payload.themeOverrides
    ),
    payload.contentOverrides,
    payload.site.templateKey
  );

const renderTodaysSiteHtml = async () => {
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
      />
    </MemoryRouter>
  );
  await screen.findByTestId("quote-availability");
  const html = container.innerHTML;
  unmount();
  return html;
};

const renderAppAt = (url) => {
  globalThis.history.replaceState(null, "", url);
  return render(<App />);
};

const moveTo = (url) =>
  act(async () => {
    globalThis.history.pushState(null, "", url);
    globalThis.dispatchEvent(new PopStateEvent("popstate"));
  });

const readSiteHtml = async () => {
  await screen.findByTestId("quote-availability");
  return document.querySelector(".publicPreviewCanvas").innerHTML;
};

beforeEach(() => {
  mockTemplateProps.length = 0;
  fetchPublicWebsiteRenderModel.mockResolvedValue(renderPayload);
  jest.spyOn(globalThis, "scrollTo").mockImplementation(() => {});
  document.title = "Domits";
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE;
  globalThis.history.replaceState(null, "", "/");
});

describe("site host routing for a site without site pages", () => {
  beforeEach(() => {
    process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE = "true";
    fetchPublicWebsiteRenderModel.mockResolvedValue(SITE_HOST_PAYLOAD);
  });

  it.each([
    "/",
    "/gallery",
    "/accommodation",
    "/contact-us",
    "/Gallery",
    "/gallery/",
    "/unknown",
    "/gallery/photos",
    "/gallery?sitePages=%7B%22gallery%22%3A%7B%22enabled%22%3Atrue%7D%7D",
  ])("renders the site as today on %s", async (url) => {
    const todaysHtml = await renderTodaysSiteHtml();

    renderAppAt(url);

    expect(await readSiteHtml()).toBe(todaysHtml);
    expect(lastTemplateProps().activePageKey).toBe("main");
    expect(document.title).toBe(SITE_TITLE);
    expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledTimes(1);
    expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledWith({ siteId: "", domain: "localhost" });
  });

  it.each([
    ["/contact", "Domits contact page"],
    ["/about", "Domits about page"],
    ["/policy", "Domits policy page"],
    ["/terms", "Domits terms page"],
  ])("keeps the Domits page on %s", (url, pageText) => {
    renderAppAt(url);

    expect(screen.getByText(pageText)).toBeInTheDocument();
    expect(fetchPublicWebsiteRenderModel).not.toHaveBeenCalled();
  });

  it.each(["gallery", "unknown", "gallery/photos"])(
    "renders the host's own site as today under the live view path %s",
    async (sitePath) => {
      const todaysHtml = await renderTodaysSiteHtml();

      renderAppAt(`/website-live/${SITE_DOMAIN}/${sitePath}`);

      expect(await readSiteHtml()).toBe(todaysHtml);
      expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledWith({ siteId: "", domain: "localhost" });
    }
  );

  it("loads the site of the live view domain as today on the live view root", async () => {
    renderAppAt(`/website-live/${SITE_DOMAIN}`);
    await screen.findByTestId("quote-availability");

    expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledWith({ siteId: "", domain: SITE_DOMAIN });
  });

  it.each(["/website-live/localhost", "/website-live?siteId="])(
    "keeps the loaded site when the guest moves to %s and back",
    async (url) => {
      renderAppAt("/");
      await screen.findByTestId("quote-availability");

      await act(async () => {
        globalThis.history.pushState(null, "", url);
        globalThis.dispatchEvent(new PopStateEvent("popstate"));
      });
      await act(async () => {
        globalThis.history.back();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId("quote-availability")).toBeInTheDocument();
      expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledTimes(1);
    }
  );

  it("does not scroll when the site is opened at the availability anchor", async () => {
    placeAvailabilityAt(900);

    renderAppAt("/#availability");
    await readSiteHtml();

    expect(listSmoothScrolls()).toEqual([]);
  });
});

describe("site host routing for a site with site pages", () => {
  beforeEach(() => {
    process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE = "true";
    fetchPublicWebsiteRenderModel.mockResolvedValue(withSitePages(SITE_HOST_PAYLOAD, GALLERY_AND_CONTACT_ON));
  });

  it.each([
    ["/gallery", "gallery", ["gallery"]],
    ["/GALLERY/", "gallery", ["gallery"]],
    ["/contact-us", "contact", ["contact"]],
    ["/accommodation", "main", ["overview", "about", "features", "lifestyle", "availability"]],
    ["/unknown", "main", ["overview", "about", "features", "lifestyle", "availability"]],
    ["/gallery/photos", "main", ["overview", "about", "features", "lifestyle", "availability"]],
  ])("routes %s to the %s page", async (url, pageKey, sectionIds) => {
    renderAppAt(url);

    await screen.findByRole("link", { name: "Home" });

    expect(lastTemplateProps().activePageKey).toBe(pageKey);
    expect(listSectionIds()).toEqual(sectionIds);
  });

  it("moves between pages through the menu without loading the site again", async () => {
    renderAppAt("/");
    await screen.findByTestId("quote-availability");

    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Gallery" }));

    expect(globalThis.location.pathname).toBe("/gallery");
    expect(listSectionIds()).toEqual(["gallery"]);

    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Reach us" }));
    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Home" }));

    expect(globalThis.location.pathname).toBe("/");
    expect(await screen.findByTestId("quote-availability")).toBeInTheDocument();
    expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledTimes(1);
  });

  it("scrolls to availability after the top scroll when Book leaves a page", async () => {
    placeAvailabilityAt(900);
    renderAppAt("/gallery");
    await screen.findByRole("link", { name: "Home" });
    globalThis.scrollTo.mockClear();

    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Book" }));

    expect(`${globalThis.location.pathname}${globalThis.location.hash}`).toBe("/#availability");
    expect(globalThis.scrollTo.mock.calls).toEqual([[0, 0], [{ top: 882, behavior: "smooth" }]]);
  });

  it("stays at the top when Home leaves a page", async () => {
    placeAvailabilityAt(900);
    renderAppAt("/gallery");
    await screen.findByRole("link", { name: "Home" });
    globalThis.scrollTo.mockClear();

    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Home" }));

    expect(globalThis.scrollTo.mock.calls).toEqual([[0, 0]]);
  });

  it("scrolls to availability when the guest opens Main at the availability anchor", async () => {
    placeAvailabilityAt(900);

    renderAppAt("/#availability");
    await screen.findByTestId("quote-availability");

    expect(listSmoothScrolls()).toEqual([[{ top: 882, behavior: "smooth" }]]);
  });

  it("titles each page and gives Main the site title again", async () => {
    renderAppAt("/contact-us");
    await screen.findByRole("link", { name: "Home" });

    expect(document.title).toBe("Reach us | Wellness Villa Bisous");

    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Home" }));

    expect(document.title).toBe(SITE_TITLE);
  });

  it("reveals the sections of the page the guest moves to", async () => {
    renderAppAt("/");
    await screen.findByTestId("quote-availability");

    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Gallery" }));

    const revealTargets = Array.from(document.querySelectorAll(".publicPreviewCanvas [data-scroll-reveal]"));
    expect(revealTargets.length).toBeGreaterThan(0);
    expect(revealTargets.filter((target) => !target.classList.contains("scrollRevealVisible"))).toEqual([]);
  });

  it("shows the site as today on a page path once the pages are no longer served", async () => {
    const todaysHtml = await renderTodaysSiteHtml();
    renderAppAt("/gallery");
    await screen.findByRole("link", { name: "Home" });
    expect(listSectionIds()).toEqual(["gallery"]);

    fetchPublicWebsiteRenderModel.mockResolvedValue(SITE_HOST_PAYLOAD);
    await act(async () => {
      globalThis.dispatchEvent(
        new MessageEvent("message", { data: { type: "website-live-site-update", domain: "localhost" } })
      );
    });

    expect(await readSiteHtml()).toBe(todaysHtml);
    expect(lastTemplateProps().activePageKey).toBe("main");
    expect(globalThis.location.pathname).toBe("/gallery");
  });
});

describe("marketplace routing for site paths", () => {
  it.each(["/gallery", "/accommodation", "/contact-us"])("shows the not found page on %s", (url) => {
    renderAppAt(url);

    expect(screen.getByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    expect(fetchPublicWebsiteRenderModel).not.toHaveBeenCalled();
  });

  it("shows the site in the live view", async () => {
    const todaysHtml = await renderTodaysSiteHtml();

    renderAppAt(`/website-live/${SITE_DOMAIN}?siteId=${SITE_ID}`);

    expect(await readSiteHtml()).toBe(todaysHtml);
    expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledWith({ siteId: SITE_ID, domain: SITE_DOMAIN });
  });

  it.each(["unknown", "gallery/photos", "contact", "main", "%2F", "%2Fgallery"])(
    "shows the not found page under the live view on %s",
    (sitePath) => {
      renderAppAt(`/website-live/${SITE_DOMAIN}/${sitePath}?siteId=${SITE_ID}`);

      expect(screen.getByText(NOT_FOUND_TEXT)).toBeInTheDocument();
      expect(fetchPublicWebsiteRenderModel).not.toHaveBeenCalled();
    }
  );
});

describe("marketplace live view page paths of a site without that page on", () => {
  const ALL_ON = { gallery: { enabled: true }, accommodation: { enabled: true }, contact: { enabled: true } };
  const arrangeSiteWithout = () => fetchPublicWebsiteRenderModel.mockResolvedValue(renderPayload);
  const arrangePageOff = (pageKey) =>
    fetchPublicWebsiteRenderModel.mockResolvedValue(
      withSitePages(renderPayload, { ...ALL_ON, [pageKey]: { enabled: false } })
    );
  const arrangeUnknownDomain = () =>
    fetchPublicWebsiteRenderModel.mockRejectedValue(new PublicWebsiteRequestError("Published website not found.", 404));
  const arrangeLoadFailure = () => fetchPublicWebsiteRenderModel.mockRejectedValue(new TypeError("Failed to fetch"));
  const CASES = [
    ["a site without pages", arrangeSiteWithout],
    ["a site with that page off", arrangePageOff],
    ["an unknown domain", arrangeUnknownDomain],
    ["a site that fails to load", arrangeLoadFailure],
  ];
  const PAGE_PATHS = [
    ["gallery", "gallery"],
    ["accommodation", "accommodation"],
    ["contact-us", "contact"],
    ["Gallery/", "gallery"],
  ];

  beforeEach(() => {
    document.title = INDEX_TITLE;
  });

  it.each(
    CASES.flatMap(([name, arrange]) => PAGE_PATHS.map(([sitePath, pageKey]) => [sitePath, name, arrange, pageKey]))
  )("shows the not found page as today on %s for %s", async (sitePath, _, arrange, pageKey) => {
    arrange(pageKey);

    renderAppAt(`/website-live/${SITE_DOMAIN}/${sitePath}?siteId=${SITE_ID}`);
    expect(screen.getByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    expect(document.querySelector(".publicPreviewCanvas")).toBeNull();
    expect(document.title).toBe("Domits");
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(fetchPublicWebsiteRenderModel.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe("marketplace live view page checks", () => {
  it("reads each site once while the live view stays open", async () => {
    let resolveFirstCheck = () => {};
    fetchPublicWebsiteRenderModel.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstCheck = resolve;
      })
    );
    renderAppAt(`/website-live/${SITE_DOMAIN}/gallery`);

    await moveTo(`/website-live/${SITE_DOMAIN}/unknown`);
    await moveTo("/website-live/other.example/gallery");
    await moveTo(`/website-live/${SITE_DOMAIN}/contact-us`);
    await act(async () => resolveFirstCheck(renderPayload));

    expect(screen.getByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    expect(fetchPublicWebsiteRenderModel.mock.calls.map(([request]) => request.domain)).toEqual([
      SITE_DOMAIN,
      "other.example",
    ]);
  });
});

describe("live view routing for a site with site pages", () => {
  const LIVE_BASE = `/website-live/${SITE_DOMAIN}`;
  const SITE_SEARCH = `?siteId=${SITE_ID}`;

  const readMenuHrefs = () => Array.from(getTopMenu().children).map((item) => item.getAttribute("href"));

  beforeEach(() => {
    fetchPublicWebsiteRenderModel.mockResolvedValue(withSitePages(renderPayload, GALLERY_AND_CONTACT_ON));
  });

  it("links every page under the live view and keeps the site id", async () => {
    renderAppAt(`${LIVE_BASE}/gallery${SITE_SEARCH}`);
    expect(screen.getByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    await screen.findByRole("link", { name: "Home" });

    expect(listSectionIds()).toEqual(["gallery"]);
    expect(document.title).toBe("Gallery | Wellness Villa Bisous");
    expect(readMenuHrefs()).toEqual([
      `${LIVE_BASE}${SITE_SEARCH}`,
      `${LIVE_BASE}/gallery${SITE_SEARCH}`,
      `${LIVE_BASE}/contact-us${SITE_SEARCH}`,
      `${LIVE_BASE}${SITE_SEARCH}#availability`,
    ]);
    expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledTimes(2);
  });

  it("shows the not found page once a refresh no longer serves the page", async () => {
    renderAppAt(`${LIVE_BASE}/gallery${SITE_SEARCH}`);
    await screen.findByRole("link", { name: "Home" });

    fetchPublicWebsiteRenderModel.mockResolvedValue(renderPayload);
    mockTemplateProps.length = 0;
    await act(async () => {
      globalThis.dispatchEvent(
        new MessageEvent("message", { data: { type: "website-live-site-update", siteId: SITE_ID } })
      );
    });

    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    expect(mockTemplateProps.filter((props) => props.activePageKey === "main").length).toBe(0);
  });

  it("keeps the failed load of one site from hiding the pages of the next", async () => {
    fetchPublicWebsiteRenderModel.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderAppAt(`${LIVE_BASE}${SITE_SEARCH}`);
    await screen.findByText("Failed to fetch");
    fetchPublicWebsiteRenderModel.mockReturnValueOnce(new Promise(() => {}));

    await moveTo("/website-live/other.example");
    await moveTo("/website-live/other.example/gallery");

    expect(await screen.findByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("shows the not found page once a refresh of the page fails", async () => {
    renderAppAt(`${LIVE_BASE}/gallery${SITE_SEARCH}`);
    await screen.findByRole("link", { name: "Home" });

    fetchPublicWebsiteRenderModel.mockRejectedValue(new TypeError("Failed to fetch"));
    await act(async () => {
      globalThis.dispatchEvent(
        new MessageEvent("message", { data: { type: "website-live-site-update", siteId: SITE_ID } })
      );
    });

    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("encodes the domain of the live view in the page links", async () => {
    renderAppAt(`/website-live/${encodeURIComponent("Villa Bisous.example")}/gallery${SITE_SEARCH}`);
    await screen.findByRole("link", { name: "Home" });

    expect(readMenuHrefs()[1]).toBe(`/website-live/villa%20bisous.example/gallery${SITE_SEARCH}`);
  });

  it("moves between pages under the live view without loading the site again", async () => {
    renderAppAt(`${LIVE_BASE}${SITE_SEARCH}`);
    await screen.findByTestId("quote-availability");

    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Reach us" }));

    expect(`${globalThis.location.pathname}${globalThis.location.search}`).toBe(
      `${LIVE_BASE}/contact-us${SITE_SEARCH}`
    );
    expect(listSectionIds()).toEqual(["contact"]);

    fireEvent.click(within(getTopMenu()).getByRole("link", { name: "Home" }));

    expect(await screen.findByTestId("quote-availability")).toBeInTheDocument();
    expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledTimes(1);
    expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledWith({ siteId: SITE_ID, domain: SITE_DOMAIN });
  });
});
