import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
const SITE_DOMAIN = renderPayload.domain.domain;
const SITE_HOST_PAYLOAD = { ...renderPayload, domain: { ...renderPayload.domain, domain: "localhost" } };
const MAIN_ID = renderPayload.site.propertyId;
const MAIN_PROPERTY = { propertyId: MAIN_ID, slug: "villa-a", isMainProperty: true };
const VILLA_B_SNAPSHOT = {
  property: { id: "property-b", title: "Villa B" },
  location: { city: "Canggu", country: "Indonesia" },
  generalDetails: [
    { detail: "Guests", value: 4 },
    { detail: "Bedrooms", value: 2 },
  ],
  images: [{ image_id: "image-b", sort_order: 0, status: "READY", web_key: "images/property-b/image-b/web.jpg" }],
};
const VILLA_B = {
  propertyId: "property-b",
  slug: "villa-b",
  isMainProperty: false,
  propertySnapshot: VILLA_B_SNAPSHOT,
};
const STAY = { checkIn: "2030-01-15", checkOut: "2030-01-22", guests: "4" };
const STAY_QUERY = "checkIn=2030-01-15&checkOut=2030-01-22&guests=4";

const withSiteProperties = (payload, siteProperties = [MAIN_PROPERTY, VILLA_B]) => ({ ...payload, siteProperties });
const QUOTE = { checkIn: STAY.checkIn, checkOut: STAY.checkOut, nights: 7, expiresAt: "2030-01-01", quoteToken: "t" };
const quoteOf = (propertyId, total, guestCount = 4) => ({
  ...QUOTE,
  quoteId: `quote-${propertyId}`,
  propertyId,
  guestCount,
  priceBreakdown: { currency: "EUR", total },
});
const answerOf = (quotes, status = 200) => ({
  ok: status === 200,
  status,
  text: async () => JSON.stringify(status === 200 ? { siteId: SITE_ID, quotes } : quotes),
});
const MAIN_BOOKED = { propertyId: MAIN_ID, error: { code: "unavailable_dates", message: "" } };
const VILLA_B_FREE = { propertyId: "property-b", quote: quoteOf("property-b", 123400) };
const mainAnswering = (code, message) => ({ propertyId: MAIN_ID, error: { code, message } });

const renderSiteAt = (url) => {
  globalThis.history.replaceState(null, "", url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/website-live/:domain/*" element={<WebsitePublicSitePage />} />
        <Route path="/*" element={<WebsitePublicSitePage />} />
      </Routes>
    </MemoryRouter>
  );
};

const openOverview = async (url = "/", payload = withSiteProperties(SITE_HOST_PAYLOAD)) => {
  fetchPublicWebsiteRenderModel.mockResolvedValue(payload);
  renderSiteAt(url);
  await screen.findByRole("heading", { name: "Our properties" });
};

const searchFor = (stay = {}) => {
  const { checkIn, checkOut, guests } = { ...STAY, ...stay };
  fireEvent.change(screen.getByLabelText("Check in"), { target: { value: checkIn } });
  fireEvent.change(screen.getByLabelText("Check out"), { target: { value: checkOut } });
  fireEvent.change(screen.getByLabelText("Guests"), { target: { value: guests } });
  fireEvent.submit(screen.getByRole("form", { name: "Search by dates" }));
};

const findResultsHeading = (name = "1 of 2 properties is free") => screen.findByRole("heading", { name });
const readSentBodies = () => global.fetch.mock.calls.map(([, options]) => JSON.parse(options.body));

beforeEach(() => {
  global.fetch = jest.fn();
  jest.spyOn(globalThis, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
  globalThis.history.replaceState(null, "", "/");
});

describe("the home page of an Elite website with its properties", () => {
  it("shows a card for every property and filters them by location, without a request", async () => {
    await openOverview();

    expect(screen.getByRole("link", { name: /Ubud, Indonesia/ })).toHaveAttribute("href", "/properties/villa-a");
    expect(screen.getByRole("link", { name: /^Villa B/ })).toHaveAttribute("href", "/properties/villa-b");
    expect(screen.getByText("Canggu, Indonesia · 4 guests · 2 bedrooms")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filter by location" })).toHaveTextContent("AllUbudCanggu");

    fireEvent.click(screen.getByRole("button", { name: "Canggu" }));

    expect(screen.queryByRole("link", { name: /Ubud, Indonesia/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Canggu" })).toHaveAttribute("aria-pressed", "true");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("leaves out the filter for one city and the date search when the site's quote panel is off", async () => {
    const sameCity = { ...VILLA_B, propertySnapshot: { ...VILLA_B_SNAPSHOT, location: { city: "ubud" }, images: [] } };
    const quotePanelOff = { ...SITE_HOST_PAYLOAD, contentOverrides: { visibility: { quotePanel: false } } };

    await openOverview("/", withSiteProperties(quotePanelOff, [MAIN_PROPERTY, sameCity]));

    expect(screen.queryByRole("group", { name: "Filter by location" })).toBeNull();
    expect(screen.queryByRole("form", { name: "Search by dates" })).toBeNull();
    expect(screen.queryByRole("img", { name: "Villa B" })).toBeNull();
  });

  it.each([
    ["/", withSiteProperties(SITE_HOST_PAYLOAD), "/properties/villa-b?"],
    [
      `/website-live/${SITE_DOMAIN}?siteId=${SITE_ID}`,
      withSiteProperties(renderPayload),
      `/website-live/${SITE_DOMAIN}/properties/villa-b?siteId=${SITE_ID}&`,
    ],
  ])(
    "on %s asks for all properties in one request and reads every answer by its property",
    async (url, payload, href) => {
      await openOverview(url, payload);
      global.fetch.mockResolvedValue(
        answerOf([{ propertyId: "property-z", quote: quoteOf("property-z", 100) }, VILLA_B_FREE, MAIN_BOOKED])
      );

      searchFor();

      expect(await findResultsHeading()).toBeInTheDocument();
      expect(readSentBodies()).toEqual([
        expect.objectContaining({ siteId: SITE_ID, propertyIds: [MAIN_ID, "property-b"], ...STAY, guests: 4 }),
      ]);
      const freeLink = screen.getByRole("link", { name: /^Villa B.*€1,234\.00 for 7 nights/ });
      expect(freeLink).toHaveAttribute("href", `${href}${STAY_QUERY}`);
      expect(screen.getByText("Not free on these dates.")).toHaveTextContent("Wellness Villa Bisous");

      fireEvent.click(screen.getByRole("button", { name: "Show all properties" }));

      expect(screen.getByRole("link", { name: /^Villa B/ })).toHaveAttribute("href", href.slice(0, -1));
    }
  );

  it.each([
    ["sleeps at most 8 guests.", mainAnswering("invalid_guest_count", "This property sleeps at most 8 guests.")],
    ["Stay at least 9 nights.", mainAnswering("stay_restriction_violation", "Stay at least 9 nights.")],
    ["can't be booked online right now.", mainAnswering("quote_unavailable", "Not bookable.")],
    ["These dates can't be booked.", mainAnswering("invalid_date_range", "checkIn must not be in the past.")],
  ])("drops a property the server no longer serves and shows the reason %s", async (reason, mainAnswer) => {
    await openOverview();
    const villaBGone = { propertyId: "property-b", error: { code: "property_not_found", message: "Not found." } };
    global.fetch.mockResolvedValue(answerOf([villaBGone, mainAnswer]));

    searchFor();

    expect(await findResultsHeading("No property is free for this stay")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(reason.replaceAll(".", "\\.")))).toHaveTextContent("Wellness Villa Bisous");
    expect(screen.queryByText(/Villa B\b/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["the pricing service is down", { propertyId: "property-b", error: { code: "pricing_service_unavailable" } }],
    ["the code is unknown", { propertyId: "property-b", error: { code: "__proto__" } }],
    ["the quote is for other guests", { propertyId: "property-b", quote: quoteOf("property-b", 100, 2) }],
    ["the property is missing", null],
  ])("offers to try again in one request when %s", async (_, villaBAnswer) => {
    await openOverview();
    global.fetch
      .mockResolvedValueOnce(answerOf([MAIN_BOOKED, villaBAnswer].filter(Boolean)))
      .mockResolvedValueOnce(answerOf([MAIN_BOOKED, VILLA_B_FREE]));

    searchFor();
    expect(await screen.findByRole("alert")).toHaveTextContent("The price could not be loaded for Villa B.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await findResultsHeading()).toBeInTheDocument();
    expect(readSentBodies()[1]).toEqual(readSentBodies()[0]);
  });

  it.each([
    ["the site is suspended", () => answerOf({ error: { code: "site_suspended" } }, 410), "isn't available"],
    ["the route is throttled", () => answerOf({ message: "Too Many Requests" }, 429), "Too many requests"],
    ["the answer is not a list", () => answerOf(null), "Something went wrong while checking"],
    ["the network fails", () => Promise.reject(new TypeError("Failed to fetch")), "couldn't check live pricing"],
  ])("keeps the overview with one message when %s", async (_, answer, message) => {
    await openOverview();
    global.fetch.mockImplementation(async () => answer());

    searchFor();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("link", { name: /^Villa B/ })).toBeInTheDocument();
  });

  it.each([
    [{ checkIn: "" }, "Choose a check-in and a check-out date."],
    [{ checkIn: "2020-01-15" }, "Check-in can't be in the past."],
    [{ checkOut: "2030-01-15" }, "Check-out must be after check-in."],
    [{ checkOut: "2031-01-17" }, "A stay can be at most 366 nights."],
    [{ checkOut: "9999-12-31" }, "A stay can be at most 366 nights."],
    [{ guests: "0" }, "Choose 1 to 50 guests."],
    [{ guests: "51" }, "Choose 1 to 50 guests."],
    [{ guests: "2.5" }, "Choose 1 to 50 guests."],
  ])("refuses %j without a request", async (stay, message) => {
    await openOverview();

    searchFor(stay);

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("accepts a stay of 366 nights for 50 guests", async () => {
    await openOverview();
    global.fetch.mockResolvedValue(answerOf([]));
    searchFor({ checkOut: "2031-01-16", guests: "50" });
    expect(readSentBodies()).toEqual([expect.objectContaining({ checkOut: "2031-01-16", guests: 50 })]);
  });

  it("keeps the newer search when the answer of an older one arrives late", async () => {
    await openOverview();
    let answerOlderSearch;
    global.fetch
      .mockReturnValueOnce(new Promise((resolve) => (answerOlderSearch = resolve)))
      .mockResolvedValueOnce(
        answerOf([MAIN_BOOKED, { propertyId: "property-b", quote: quoteOf("property-b", 55500, 2) }])
      );

    searchFor();
    searchFor({ guests: "2" });
    expect(await screen.findByText("€555.00 for 7 nights")).toBeInTheDocument();
    await act(async () =>
      answerOlderSearch(answerOf([VILLA_B_FREE, { propertyId: MAIN_ID, quote: quoteOf(MAIN_ID, 900) }]))
    );

    expect(screen.getByRole("heading", { name: "1 of 2 properties is free" })).toBeInTheDocument();
    expect(screen.queryByText(/€1,234\.00/)).toBeNull();
  });

  it("sends one request when the same search is sent twice", async () => {
    await openOverview();
    global.fetch.mockResolvedValue(answerOf([MAIN_BOOKED, VILLA_B_FREE]));

    searchFor();
    fireEvent.submit(screen.getByRole("form", { name: "Search by dates" }));

    expect(await findResultsHeading()).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
