import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EliteSitePropertyBookingPanel from "../rendering/templates/elite/EliteSitePropertyBookingPanel";
import { WebsitePublicQuoteError, requestPublicWebsiteQuote } from "../services/websitePublicQuoteService";

jest.mock("../services/websitePublicQuoteService", () => {
  const actual = jest.requireActual("../services/websitePublicQuoteService");
  return { ...actual, requestPublicWebsiteQuote: jest.fn() };
});

const STAY = { checkIn: "2099-01-10", checkOut: "2099-01-14", guests: 3 };
const QUOTE = {
  quoteId: "quote_1",
  propertyId: "property-b",
  checkIn: STAY.checkIn,
  checkOut: STAY.checkOut,
  guestCount: STAY.guests,
  nights: 4,
  priceBreakdown: { currency: "EUR", nightlyBaseTotal: 80000, cleaningFee: 5000, total: 85000 },
  expiresAt: "2099-01-01T10:30:00.000Z",
  quoteToken: "qtok",
};
const MODEL = { stay: { guests: 4, nightlyRate: 200 }, host: { whatsapp: { isAvailable: false } } };
const NO_STAY = { checkIn: null, checkOut: null, guests: null };

const buildRequestHref = (stay) => `/properties/villa-b/request?checkIn=${stay.checkIn}&guests=${stay.guests}`;

const renderPanel = (initialStay = STAY) =>
  render(
    <MemoryRouter>
      <EliteSitePropertyBookingPanel
        model={MODEL}
        siteId="site-1"
        propertyId="property-b"
        initialStay={initialStay}
        buildRequestHref={buildRequestHref}
      />
    </MemoryRouter>
  );

const quoteError = (code, message = "") => new WebsitePublicQuoteError({ code, message, status: 409 });
const checkButton = () => screen.queryByRole("button", { name: "Check availability" });
const requestLink = () => screen.queryByRole("link", { name: "Request to book" });

beforeEach(() => {
  requestPublicWebsiteQuote.mockReset();
});

describe("the booking panel of an Elite property page", () => {
  it("asks for the dates first and quotes the stay the guest picks", async () => {
    requestPublicWebsiteQuote.mockResolvedValue({ ...QUOTE, guestCount: 2 });
    renderPanel(NO_STAY);

    expect(requestPublicWebsiteQuote).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Check in"), { target: { value: STAY.checkIn } });
    expect(checkButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Check out"), { target: { value: STAY.checkOut } });
    fireEvent.click(checkButton());

    expect(await screen.findByRole("link", { name: "Request to book" })).toHaveAttribute(
      "href",
      "/properties/villa-b/request?checkIn=2099-01-10&guests=2"
    );
    expect(checkButton()).toBeNull();
    expect(requestPublicWebsiteQuote).toHaveBeenCalledWith(expect.objectContaining({ ...STAY, guests: 2 }));
  });

  it("keeps the check off for a stay in the past", () => {
    renderPanel(NO_STAY);

    fireEvent.change(screen.getByLabelText("Check in"), { target: { value: "2020-01-10" } });
    fireEvent.change(screen.getByLabelText("Check out"), { target: { value: "2020-01-14" } });

    expect(checkButton()).toBeDisabled();
  });

  it.each([
    ["the guests", () => fireEvent.click(screen.getByRole("button", { name: "Add a guest" }))],
    ["the check-out", () => fireEvent.change(screen.getByLabelText("Check out"), { target: { value: "2099-01-15" } })],
  ])("takes the request link away once %s change after the quote", async (_, change) => {
    requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
    renderPanel();
    await screen.findByRole("link", { name: "Request to book" });

    change();

    expect(requestLink()).toBeNull();
    expect(screen.getByText("Selection changed — check again")).toBeInTheDocument();
    expect(checkButton()).toBeEnabled();
  });

  it.each([
    ["property_not_found", "", "This property can't be booked on this website right now.", false, STAY.checkIn],
    ["unavailable_dates", "", "Those dates are no longer available — please choose different dates.", true, ""],
    ["stay_restriction_violation", "Stay at least 7 nights.", "Stay at least 7 nights.", true, STAY.checkIn],
    ["invalid_guest_count", "Up to 4 guests here.", "Up to 4 guests here.", true, STAY.checkIn],
  ])("shows %s to the guest without a request link", async (code, message, shownText, canCheckAgain, checkIn) => {
    requestPublicWebsiteQuote.mockRejectedValue(quoteError(code, message));
    renderPanel({ ...STAY, guests: 9 });

    expect(await screen.findByText(shownText)).toBeInTheDocument();
    expect(requestLink()).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(Boolean(checkButton())).toBe(canCheckAgain);
    expect(screen.getByLabelText("Check in")).toHaveValue(checkIn);
  });

  it("offers a retry when the price cannot be checked", async () => {
    requestPublicWebsiteQuote.mockRejectedValueOnce(quoteError("network_error")).mockResolvedValueOnce(QUOTE);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: "Request to book" })).toBeInTheDocument();
    expect(requestPublicWebsiteQuote).toHaveBeenCalledTimes(2);
  });
});
