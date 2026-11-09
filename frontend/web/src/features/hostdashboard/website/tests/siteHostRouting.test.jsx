import React from "react";
import { render, screen } from "@testing-library/react";
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

const { fetchPublicWebsiteRenderModel } = jest.requireMock("../services/websitePublicSiteService");

const SITE_DOMAIN = renderPayload.domain.domain;
const SITE_ID = renderPayload.site.id;
const SITE_TITLE = "Wellness Villa Bisous | Ubud, Indonesia";
const NOT_FOUND_TEXT = "The page you were looking for does not exist or has been removed";
const SITE_HOST_PAYLOAD = { ...renderPayload, domain: { ...renderPayload.domain, domain: "localhost" } };

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

const readSiteHtml = async () => {
  await screen.findByTestId("quote-availability");
  return document.querySelector(".publicPreviewCanvas").innerHTML;
};

beforeEach(() => {
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

  it.each(["/", "/gallery", "/accommodation", "/contact-us", "/Gallery", "/gallery/", "/unknown", "/gallery/photos"])(
    "renders the site as today on %s",
    async (url) => {
      const todaysHtml = await renderTodaysSiteHtml();

      renderAppAt(url);

      expect(await readSiteHtml()).toBe(todaysHtml);
      expect(document.title).toBe(SITE_TITLE);
      expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledTimes(1);
      expect(fetchPublicWebsiteRenderModel).toHaveBeenCalledWith({ siteId: "", domain: "localhost" });
    }
  );

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

  it.each(["gallery", "accommodation", "contact-us", "unknown", "gallery/photos"])(
    "shows the not found page under the live view on %s",
    (sitePath) => {
      renderAppAt(`/website-live/${SITE_DOMAIN}/${sitePath}?siteId=${SITE_ID}`);

      expect(screen.getByText(NOT_FOUND_TEXT)).toBeInTheDocument();
      expect(fetchPublicWebsiteRenderModel).not.toHaveBeenCalled();
    }
  );
});
