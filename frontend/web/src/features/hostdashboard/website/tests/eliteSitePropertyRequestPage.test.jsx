import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
const MAIN_ID = renderPayload.site.propertyId;
const VILLA_B = {
  propertyId: "property-b",
  slug: "villa-b",
  isMainProperty: false,
  propertySnapshot: {
    property: { id: "property-b", title: "Villa B" },
    location: { city: "Canggu", country: "Indonesia" },
    generalDetails: [{ detail: "Guests", value: 4 }],
    images: [{ image_id: "image-b", sort_order: 0, status: "READY", web_key: "images/property-b/image-b/web.jpg" }],
  },
};
const SITE_PROPERTIES = [{ propertyId: MAIN_ID, slug: "villa-a", isMainProperty: true }, VILLA_B];
const PAYLOAD = {
  ...renderPayload,
  domain: { ...renderPayload.domain, domain: "localhost" },
  siteProperties: SITE_PROPERTIES,
};
const STAY_QUERY = "checkIn=2099-01-10&checkOut=2099-01-14&guests=3";
const REQUEST_URL = `/properties/villa-b/request?${STAY_QUERY}`;
const GUEST = { name: "Ana Silva", email: "ana@example.com" };

const answer = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
const quoteAnswer = (changes = {}) =>
  answer(200, {
    quoteId: "quote-1",
    propertyId: "property-b",
    checkIn: "2099-01-10",
    checkOut: "2099-01-14",
    nights: 4,
    guestCount: 3,
    priceBreakdown: { currency: "EUR", nightlyBaseTotal: 80000, cleaningFee: 5000, total: 85000 },
    expiresAt: "2099-01-01T10:00:00.000Z",
    quoteToken: "token-1",
    ...changes,
  });
const errorAnswer = (code, status = 409, message = "") => answer(status, { error: { code, message } });
const SENT = answer(201, {
  publicBookingRef: "DBW-7KQ2M",
  status: "REQUESTED",
  siteId: SITE_ID,
  checkIn: "2099-01-10",
  checkOut: "2099-01-14",
  guests: 3,
  total: 85000,
  currency: "EUR",
});

const answerWith = ({ quotes = [quoteAnswer()], sends = [SENT] } = {}) => {
  const quoteQueue = [...quotes];
  const sendQueue = [...sends];
  globalThis.fetch = jest.fn(async (url) => {
    const queue = String(url).endsWith("/bookings") ? sendQueue : quoteQueue;
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
};

const callsTo = (ending) => globalThis.fetch.mock.calls.filter(([url]) => String(url).endsWith(ending));
const quoteBodies = () => callsTo("/quote").map(([, options]) => JSON.parse(options.body));
const sends = () => callsTo("/bookings").map(([, options]) => ({ ...JSON.parse(options.body), ...options.headers }));

const renderSiteAt = (url, payload = PAYLOAD) => {
  fetchPublicWebsiteRenderModel.mockResolvedValue(payload);
  globalThis.history.replaceState(null, "", url);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/*" element={<WebsitePublicSitePage />} />
      </Routes>
    </MemoryRouter>
  );
};

const findForm = async () => {
  await screen.findByText("€850.00");
  return screen.getByRole("button", { name: "Request to book" });
};

const fillAndSend = async () => {
  const sendButton = await findForm();
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: GUEST.name } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: GUEST.email } });
  fireEvent.click(sendButton);
};

beforeEach(() => {
  globalThis.localStorage.clear();
  jest.spyOn(globalThis, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete globalThis.fetch;
});

describe("the request to book page of an Elite website", () => {
  it("quotes the stay of the link and shows it next to the form, then sends name and email", async () => {
    answerWith();
    renderSiteAt(REQUEST_URL);

    await findForm();
    const summary = screen.getByRole("complementary", { name: "Your stay" });
    expect(within(summary).getByRole("img", { name: "Villa B" })).toHaveAttribute(
      "src",
      expect.stringContaining("images/property-b/image-b/web.jpg")
    );
    expect(within(summary).getByText("Canggu, Indonesia")).toBeInTheDocument();
    expect(within(summary).getByText("Sat 10 Jan to Wed 14 Jan")).toBeInTheDocument();
    expect(within(summary).getByText("€200.00 × 4 nights")).toBeInTheDocument();
    expect(within(summary).getByText("Cleaning fee")).toBeInTheDocument();
    expect(document.querySelector("[data-panorama-page-header] h1").textContent).toBe("Request to book");
    expect(quoteBodies()).toEqual([
      expect.objectContaining({ siteId: SITE_ID, propertyId: "property-b", checkIn: "2099-01-10", guests: 3 }),
    ]);

    await fillAndSend();

    expect(await screen.findByText("DBW-7KQ2M")).toBeInTheDocument();
    expect(sends()).toEqual([
      expect.objectContaining({ quoteToken: "token-1", guest: GUEST, "Idempotency-Key": expect.any(String) }),
    ]);
  });

  it("quotes the main property without a property id", async () => {
    answerWith({ quotes: [quoteAnswer({ propertyId: MAIN_ID })] });
    renderSiteAt(`/properties/villa-a/request?${STAY_QUERY}`);

    await findForm();
    expect(quoteBodies()[0]).not.toHaveProperty("propertyId");
  });

  it.each([
    ["no dates", "guests=3"],
    ["dates in the past", "checkIn=2020-01-10&checkOut=2020-01-14&guests=3"],
    ["a check-out before the check-in", "checkIn=2099-01-14&checkOut=2099-01-10&guests=3"],
    ["a stay longer than a year", "checkIn=2099-01-10&checkOut=2100-01-20&guests=3"],
    ["a date that does not exist", "checkIn=2099-02-30&checkOut=2099-03-02&guests=3"],
  ])("asks for the dates instead of quoting for %s", async (_, query) => {
    answerWith();
    renderSiteAt(`/properties/villa-b/request?${query}`);

    expect(await screen.findByText("Choose your dates to request this stay.")).toBeInTheDocument();
    expect(screen.getByLabelText("Check in")).toHaveValue("");
    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["more guests than the property takes", errorAnswer("invalid_guest_count", 400, "Up to 4 guests here.")],
    ["dates that are taken", errorAnswer("unavailable_dates")],
  ])("lets the guest change the stay without a form for %s", async (_, refusal) => {
    answerWith({ quotes: [refusal] });
    renderSiteAt(REQUEST_URL);

    expect(await screen.findByText("Choose your dates to request this stay.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Check availability" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Your name")).toBeNull();
  });

  it("shows the not found page for a slug the site does not serve", async () => {
    answerWith();
    renderSiteAt(`/properties/villa-z/request?${STAY_QUERY}`);

    expect(await screen.findByText(/does not exist or has been removed/)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("says that online booking is off and quotes nothing when the site has no quote panel", async () => {
    answerWith();
    const contentOverrides = { ...PAYLOAD.contentOverrides, visibility: { quotePanel: false } };
    renderSiteAt(REQUEST_URL, { ...PAYLOAD, contentOverrides });

    expect(await screen.findByText("Online booking isn't available for this site right now.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Villa B" })).toHaveAttribute(
      "href",
      `/properties/villa-b?${STAY_QUERY}`
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sends one request for a double click", async () => {
    answerWith({ sends: [new Promise((resolve) => setTimeout(() => resolve(SENT), 20))] });
    renderSiteAt(REQUEST_URL);

    await fillAndSend();
    fireEvent.click(screen.getByRole("button", { name: /Sending|Request to book/ }));

    expect(await screen.findByText("DBW-7KQ2M")).toBeInTheDocument();
    expect(sends()).toHaveLength(1);
  });

  it("quotes again when the price expired on the way, keeps what the guest typed and sends the new price", async () => {
    answerWith({
      quotes: [quoteAnswer(), quoteAnswer({ quoteId: "quote-2", quoteToken: "token-2" })],
      sends: [errorAnswer("quote_expired"), SENT],
    });
    renderSiteAt(REQUEST_URL);

    await fillAndSend();
    expect(await screen.findByText(/we've refreshed it/)).toBeInTheDocument();
    await waitFor(() => expect(quoteBodies()).toHaveLength(2));
    expect(screen.getByLabelText("Your name")).toHaveValue(GUEST.name);

    fireEvent.click(screen.getByRole("button", { name: "Request to book" }));

    expect(await screen.findByText("DBW-7KQ2M")).toBeInTheDocument();
    expect(sends().map((sent) => sent.quoteToken)).toEqual(["token-1", "token-2"]);
  });

  it("checks a price that expired before the send instead of sending it", async () => {
    answerWith({ quotes: [quoteAnswer({ expiresAt: "2000-01-01T00:00:00.000Z" }), quoteAnswer()] });
    renderSiteAt(REQUEST_URL);

    expect(await screen.findByText(/^Price expired/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: GUEST.name } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: GUEST.email } });
    fireEvent.click(screen.getByRole("button", { name: "Request to book" }));

    await waitFor(() => expect(quoteBodies()).toHaveLength(2));
    expect(sends()).toHaveLength(0);
  });

  it("sends with the same key after a refresh that follows an unknown outcome", async () => {
    answerWith({
      quotes: [quoteAnswer(), quoteAnswer({ quoteId: "quote-2", quoteToken: "token-2" })],
      sends: [new TypeError("Failed to fetch"), SENT],
    });
    const firstVisit = renderSiteAt(REQUEST_URL);
    await fillAndSend();
    expect(await screen.findByRole("alert")).toHaveTextContent(/connection|reach|network|try again/i);
    firstVisit.unmount();

    renderSiteAt(REQUEST_URL);
    await fillAndSend();

    expect(await screen.findByText("DBW-7KQ2M")).toBeInTheDocument();
    const [firstSend, secondSend] = sends();
    expect(secondSend.quoteToken).toBe("token-2");
    expect(secondSend["Idempotency-Key"]).toBe(firstSend["Idempotency-Key"]);
  });

  it("asks for new dates once the dates are taken at the send", async () => {
    answerWith({ sends: [errorAnswer("unavailable_dates")] });
    renderSiteAt(REQUEST_URL);

    await fillAndSend();

    expect(await screen.findByRole("alert")).toHaveTextContent(/no longer available/);
    expect(screen.getByLabelText("Check in")).toHaveValue("");
    expect(screen.queryByLabelText("Your name")).toBeNull();
  });
});
