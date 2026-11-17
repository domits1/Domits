import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EliteSitePropertyRequestPage from "../rendering/templates/elite/EliteSitePropertyRequestPage";
import { WebsitePublicQuoteError, requestPublicWebsiteQuote } from "../services/websitePublicQuoteService";
import { WebsitePublicBookingError, requestPublicSiteBooking } from "../services/websitePublicBookingService";

jest.mock("../services/websitePublicQuoteService", () => ({
  ...jest.requireActual("../services/websitePublicQuoteService"),
  requestPublicWebsiteQuote: jest.fn(),
}));
jest.mock("../services/websitePublicBookingService", () => ({
  ...jest.requireActual("../services/websitePublicBookingService"),
  requestPublicSiteBooking: jest.fn(),
}));

const STAY = { checkIn: "2099-01-10", checkOut: "2099-01-14", guests: 3 };
const PROPERTY_HREF = "/properties/villa-b?checkIn=2099-01-10&checkOut=2099-01-14&guests=3";
const PRICE = { currency: "EUR", nightlyBaseTotal: 80000, cleaningFee: 5000, total: 85000 };
const QUOTE = {
  ...STAY,
  quoteId: "quote-1",
  propertyId: "property-b",
  nights: 4,
  guestCount: 3,
  priceBreakdown: PRICE,
  expiresAt: "2099-01-01T10:00:00.000Z",
  quoteToken: "token-1",
};
const SENT = { publicBookingRef: "DBW-ABCDEFGHJK", status: "REQUESTED", ...STAY, total: 85000, currency: "EUR" };
const MODEL = { site: { title: "Wellness Villa Bisous", locationLabel: "Ubud, Indonesia" }, stay: { guests: 4 } };
const PAGE = {
  kind: "request",
  pageKey: "accommodation",
  title: "Villa B",
  overviewHref: "/",
  navItems: [],
  stay: STAY,
  booking: { key: "property-b", siteId: "site-1", propertyId: "property-b" },
  buildRequestHref: () => "",
  headerTone: "light",
  propertyHref: PROPERTY_HREF,
};

const renderPage = (page = {}) =>
  render(
    <MemoryRouter>
      <EliteSitePropertyRequestPage
        sitePropertyPage={{ ...PAGE, ...page }}
        headerTone="light"
        model={MODEL}
        viewState={{ showTopBar: false }}
        headerRef={() => {}}
      />
    </MemoryRouter>
  );

const quoteError = (code, message = "") => new WebsitePublicQuoteError({ code, message, status: 409 });
const bookingError = (code, message = "", status = 400) =>
  new WebsitePublicBookingError({ code, message, status, requestId: "req-1" });
const sendButton = () => screen.queryByRole("button", { name: "Send request" });
const fillIn = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fillContact = () => {
  fillIn("Your name", "Ana Guest");
  fillIn("Email address", "ana@example.com");
};
const send = () =>
  act(async () => {
    fireEvent.click(sendButton());
  });
const sentKeys = () => requestPublicSiteBooking.mock.calls.map(([request]) => request.idempotencyKey);
const waitForPrice = () => screen.findByText("€850.00");
const renderFilledForm = async () => {
  renderPage();
  await waitForPrice();
  fillContact();
};

beforeEach(() => {
  requestPublicWebsiteQuote.mockReset();
  requestPublicSiteBooking.mockReset();
  requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
  globalThis.localStorage.clear();
});

describe("the request to book page of an Elite property", () => {
  it("quotes the stay of the link, sends the guest's details and shows the sent page", async () => {
    requestPublicSiteBooking.mockResolvedValue(SENT);
    await renderFilledForm();

    expect(requestPublicWebsiteQuote).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "site-1", propertyId: "property-b", ...STAY })
    );
    expect(screen.getByRole("complementary", { name: "Your stay" })).toHaveTextContent(
      "Villa BUbud, IndonesiaDatesSat 10 Jan to Wed 14 JanGuests3"
    );
    fillIn("Phone (optional)", " +31 6 1234 5678 ");
    fillIn("Message to the host (optional)", "We arrive late.\n");
    await send();

    expect(requestPublicSiteBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "site-1",
        quoteToken: "token-1",
        guest: { name: "Ana Guest", email: "ana@example.com", phone: "+31 6 1234 5678" },
        message: "We arrive late.",
      })
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your request has been sent");
    expect(screen.getByText("DBW-ABCDEFGHJK")).toBeInTheDocument();
    expect(
      screen.getByText("The host checks your request and replies by email. You have not paid anything.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to our properties" })).toHaveAttribute("href", "/");
    expect(sendButton()).toBeNull();
  });

  it.each([
    ["without a stay in the link", { stay: { ...STAY, checkIn: null, checkOut: null } }, "", /^Choose your dates/],
    ["when the site has no booking panel", { booking: null }, "", /^Online booking isn't available/],
    ["after property_not_found", {}, "property_not_found", "This property can't be booked on this website right now."],
    ["after unavailable_dates", {}, "unavailable_dates", /^Those dates are no longer available/],
    ["after stay_restriction_violation", {}, "stay_restriction_violation", "Stay at least 7 nights."],
  ])("shows the way back %s", async (_, page, quoteCode, shownText) => {
    requestPublicWebsiteQuote.mockRejectedValue(quoteError(quoteCode, "Stay at least 7 nights."));
    renderPage(page);

    expect(await screen.findByText(shownText)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Villa B" })).toHaveAttribute("href", PROPERTY_HREF);
    expect(Boolean(screen.queryByRole("link", { name: "See our other properties" }))).toBe(
      quoteCode === "property_not_found"
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(requestPublicWebsiteQuote).toHaveBeenCalledTimes(quoteCode ? 1 : 0);
    expect(sendButton()).toBeNull();
  });

  it("quotes again when the price could not be checked", async () => {
    requestPublicWebsiteQuote.mockRejectedValueOnce(quoteError("network_error"));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    await waitForPrice();
    expect(sendButton()).toBeEnabled();
  });

  it("checks the name and email before anything is sent", async () => {
    renderPage();
    await waitForPrice();

    await send();

    expect(screen.getByLabelText("Your name")).toHaveAccessibleDescription("Please enter your name.");
    expect(screen.getByLabelText("Email address")).toHaveAccessibleDescription("Please enter a valid email address.");
    expect(requestPublicSiteBooking).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid_guest_phone", "Phone (optional)", "Please enter a phone number of 6 to 15 digits."],
    [
      "invalid_guest_message",
      "Message to the host (optional)",
      "Your message must be text of at most 2000 characters.",
    ],
  ])("shows %s under its field and sends the fix with the same key", async (code, label, message) => {
    requestPublicSiteBooking.mockRejectedValueOnce(bookingError(code, message)).mockResolvedValueOnce(SENT);
    await renderFilledForm();
    fillIn(label, "12");

    await send();

    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
    expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Your name")).toHaveValue("Ana Guest");
    expect(screen.getByLabelText(label)).toHaveValue("12");
    fillIn(label, "+31 6 1234 5678");
    expect(screen.getByLabelText(label)).not.toHaveAttribute("aria-invalid");
    await send();

    expect(screen.getByText("DBW-ABCDEFGHJK")).toBeInTheDocument();
    expect(new Set(sentKeys()).size).toBe(1);
  });

  it.each([
    ["property_not_found", 404, "This property can no longer be booked on this website.", true],
    ["unavailable_dates", 409, "Those dates are no longer available", false],
    ["site_suspended", 410, "Online booking isn't available for this site right now.", false],
  ])("stops the request when the send answers %s", async (code, status, shownText, offersOtherProperties) => {
    requestPublicSiteBooking.mockRejectedValue(bookingError(code, shownText, status));
    await renderFilledForm();

    await send();

    expect(screen.getByRole("alert")).toHaveTextContent(shownText);
    expect(screen.getByRole("link", { name: "Back to Villa B" })).toHaveAttribute("href", PROPERTY_HREF);
    expect(Boolean(screen.queryByRole("link", { name: "See our other properties" }))).toBe(offersOtherProperties);
    expect(sendButton()).toBeNull();
  });

  it("tries again with the same key after the booking service was unavailable", async () => {
    requestPublicSiteBooking
      .mockRejectedValueOnce(bookingError("booking_service_unavailable", "Please try again.", 503))
      .mockResolvedValueOnce(SENT);
    await renderFilledForm();
    fillIn("Message to the host (optional)", "We arrive late.");

    await send();
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't send your request. Please try again.");
    expect(screen.getByLabelText("Message to the host (optional)")).toHaveValue("We arrive late.");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });

    expect(screen.getByText("DBW-ABCDEFGHJK")).toBeInTheDocument();
    expect(sentKeys()).toHaveLength(2);
    expect(new Set(sentKeys()).size).toBe(1);
  });

  it("quotes again when the price expired at the send and keeps what the guest typed", async () => {
    requestPublicWebsiteQuote
      .mockResolvedValueOnce(QUOTE)
      .mockResolvedValueOnce({ ...QUOTE, quoteId: "quote-2", quoteToken: "token-2" });
    requestPublicSiteBooking.mockRejectedValueOnce(bookingError("quote_expired", "", 409)).mockResolvedValueOnce(SENT);
    await renderFilledForm();

    await send();

    expect(await screen.findByText(/^The price changed/)).toBeInTheDocument();
    expect(requestPublicWebsiteQuote).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Email address")).toHaveValue("ana@example.com");
    await send();
    expect(requestPublicSiteBooking.mock.calls[1][0].quoteToken).toBe("token-2");
    expect(new Set(sentKeys()).size).toBe(2);
  });

  it.each([
    [
      "has expired",
      () => requestPublicWebsiteQuote.mockResolvedValueOnce({ ...QUOTE, expiresAt: "2000-01-01" }),
      /^Price expired/,
    ],
    [
      "is refused at the send",
      () => requestPublicSiteBooking.mockRejectedValueOnce(bookingError("quote_token_invalid")),
      /^Price needs/,
    ],
  ])("holds the send back once the price %s and checks it again", async (_, arrange, notice) => {
    arrange();
    await renderFilledForm();
    await send();

    expect(await screen.findByText(notice)).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Check the price again" }));
    await screen.findByText(/^Valid until/);
    expect(sendButton()).toBeEnabled();
  });

  it("sends once when the guest clicks twice", async () => {
    requestPublicSiteBooking.mockReturnValue(new Promise(() => {}));
    await renderFilledForm();

    await act(async () => {
      fireEvent.click(sendButton());
      fireEvent.click(sendButton());
    });

    expect(requestPublicSiteBooking).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });
});
