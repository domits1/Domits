import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import WebsitePublicSitePage from "../WebsitePublicSitePage";

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

const SITE_ID = renderPayload.site.id;
const VILLA_B = {
  propertyId: "property-b",
  slug: "villa-b",
  isMainProperty: false,
  propertySnapshot: {
    property: { id: "property-b", title: "Villa B" },
    location: { city: "Canggu", country: "Indonesia" },
    generalDetails: [{ detail: "Guests", value: 4 }],
  },
};
const SITE_PROPERTIES = [{ propertyId: renderPayload.site.propertyId, slug: "villa-a", isMainProperty: true }, VILLA_B];
const PAYLOAD = {
  ...renderPayload,
  domain: { ...renderPayload.domain, domain: "localhost" },
  siteProperties: SITE_PROPERTIES,
};
const STAY_QUERY = "checkIn=2099-01-10&checkOut=2099-01-14&guests=3";
const SENT_STATE = { sentRequest: { reference: "DBW-7KQ2M", checkIn: "2099-01-10", checkOut: "2099-01-14" } };

const answer = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
const QUOTE = answer(200, {
  quoteId: "quote-1",
  propertyId: "property-b",
  checkIn: "2099-01-10",
  checkOut: "2099-01-14",
  nights: 4,
  guestCount: 3,
  priceBreakdown: { currency: "EUR", nightlyBaseTotal: 80000, cleaningFee: 0, total: 80000 },
  expiresAt: "2099-01-01T10:00:00.000Z",
  quoteToken: "token-1",
});
const SENT = answer(201, {
  publicBookingRef: "DBW-7KQ2M",
  checkIn: "2099-01-10",
  checkOut: "2099-01-14",
  guests: 3,
  total: 80000,
});

function HistoryProbe() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  return (
    <button
      type="button"
      data-testid="history-probe"
      data-location={`${pathname}${search}`}
      onClick={() => navigate(-1)}>
      Browser back
    </button>
  );
}

const renderSite = ({ entries, payload = PAYLOAD }) => {
  const lastEntry = entries.at(-1);
  globalThis.history.replaceState(
    null,
    "",
    typeof lastEntry === "string" ? lastEntry : lastEntry.pathname + (lastEntry.search ?? "")
  );
  fetchPublicWebsiteRenderModel.mockResolvedValue(payload);
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <HistoryProbe />
      <Routes>
        <Route path="/website-live/:domain/*" element={<WebsitePublicSitePage />} />
        <Route path="/*" element={<WebsitePublicSitePage />} />
      </Routes>
    </MemoryRouter>
  );
};

const withSitePages = (sitePages, whatsapp = { isAvailable: false }) => ({
  ...PAYLOAD,
  propertySnapshot: { ...PAYLOAD.propertySnapshot, hostProfile: { givenName: "Amara", whatsapp } },
  contentOverrides: { ...PAYLOAD.contentOverrides, sitePages },
});

const readHeading = () => document.querySelector("[data-panorama-page-header] h1")?.textContent;
const probe = () => screen.getByTestId("history-probe");

beforeEach(() => {
  globalThis.localStorage.clear();
  jest.spyOn(globalThis, "scrollTo").mockImplementation(() => {});
  globalThis.fetch = jest.fn(async (url) => (String(url).endsWith("/bookings") ? SENT : QUOTE));
});

afterEach(() => {
  jest.restoreAllMocks();
  delete globalThis.fetch;
});

describe("the request sent page of an Elite website", () => {
  it("follows a sent request in place of the request page, so back leads to the property page", async () => {
    renderSite({
      entries: [`/properties/villa-b?${STAY_QUERY}`, `/properties/villa-b/request?${STAY_QUERY}`],
      payload: withSitePages({ contact: { enabled: true } }),
    });
    await screen.findByText("Total");
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Silva" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Request to book" }));

    const card = await screen.findByRole("status");
    expect(probe()).toHaveAttribute("data-location", "/properties/villa-b/sent");
    expect(readHeading()).toBe("Your request has been sent");
    expect(
      within(card).getByText(
        "The host of Villa B has your request for 10 to 14 January 2099. You have not paid anything yet."
      )
    ).toBeInTheDocument();
    expect(
      within(card)
        .getAllByRole("listitem")
        .map((step) => step.textContent)
    ).toEqual([
      "The host checks your request and accepts or declines it.",
      "If accepted, you get an email with a link to pay.",
      "After payment your stay is confirmed.",
    ]);
    expect(within(card).getByText("DBW-7KQ2M")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to our properties" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Contact the host" })).toHaveAttribute("href", "/contact-us");

    await act(async () => fireEvent.click(probe()));

    expect(probe()).toHaveAttribute("data-location", `/properties/villa-b?${STAY_QUERY}`);
    expect(globalThis.fetch.mock.calls.filter(([url]) => String(url).endsWith("/bookings"))).toHaveLength(1);
  });

  it.each([
    ["within one month", "2027-01-15", "2027-01-22", "15 to 22 January 2027"],
    ["across two months", "2027-01-28", "2027-02-03", "28 January to 3 February 2027"],
    ["across two years", "2026-12-30", "2027-01-02", "30 December 2026 to 2 January 2027"],
  ])("writes the dates of a stay %s with the year", async (_, checkIn, checkOut, stayText) => {
    renderSite({
      entries: [
        { pathname: "/properties/villa-b/sent", state: { sentRequest: { reference: "DBW-7KQ2M", checkIn, checkOut } } },
      ],
    });

    expect(
      await screen.findByText(`The host of Villa B has your request for ${stayText}. You have not paid anything yet.`)
    ).toBeInTheDocument();
  });

  it("shows the sent request again after a reload of the page, without sending anything", async () => {
    fetchPublicWebsiteRenderModel.mockResolvedValue(PAYLOAD);
    globalThis.history.replaceState({ usr: SENT_STATE, key: "sent", idx: 0 }, "", "/properties/villa-b/sent");
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<WebsitePublicSitePage />} />
        </Routes>
      </BrowserRouter>
    );

    expect(await screen.findByText("DBW-7KQ2M")).toBeInTheDocument();
    expect(readHeading()).toBe("Your request has been sent");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["opened directly", undefined],
    ["opened with a state that is not a request", { sentRequest: { reference: " ", checkIn: "2099-01-10" } }],
    [
      "opened with dates that are not dates",
      { sentRequest: { reference: "DBW-7KQ2M", checkIn: "10 January", checkOut: "2099-01-14" } },
    ],
  ])("says there is no request to show when %s", async (_, state) => {
    renderSite({ entries: [{ pathname: "/properties/villa-b/sent", state }] });

    expect(await screen.findByText(/only right after you send it/)).toBeInTheDocument();
    expect(readHeading()).toBe("No request to show");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("link", { name: "Contact the host" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to Villa B" })).toHaveAttribute("href", "/properties/villa-b");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      "WhatsApp when the site has no contact page",
      { isAvailable: true, phoneNumberDigits: "31612345678" },
      "https://wa.me/31612345678",
    ],
    ["nothing when the host has no way to be reached", { isAvailable: false }, null],
  ])("contacts the host through %s", async (_, whatsapp, href) => {
    renderSite({
      entries: [{ pathname: "/properties/villa-b/sent", state: SENT_STATE }],
      payload: withSitePages({}, whatsapp),
    });

    await screen.findByText("DBW-7KQ2M");
    const contactLink = screen.queryByRole("link", { name: "Contact the host" });
    expect(contactLink?.getAttribute("href") ?? null).toBe(href);
  });

  it("keeps the site id of the live view when it sends and in its links", async () => {
    const base = `/website-live/${renderPayload.domain.domain}`;
    const siteSearch = `?siteId=${SITE_ID}`;
    renderSite({
      entries: [`${base}/properties/villa-b/request${siteSearch}&${STAY_QUERY}`],
      payload: { ...withSitePages({ contact: { enabled: true } }), domain: renderPayload.domain },
    });
    await screen.findByText("Total");
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Silva" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Request to book" }));

    await screen.findByText("DBW-7KQ2M");
    expect(probe()).toHaveAttribute("data-location", `${base}/properties/villa-b/sent${siteSearch}`);
    expect(screen.getByRole("link", { name: "Back to our properties" })).toHaveAttribute(
      "href",
      `${base}${siteSearch}`
    );
    expect(screen.getByRole("link", { name: "Contact the host" })).toHaveAttribute(
      "href",
      `${base}/contact-us${siteSearch}`
    );
  });
});
