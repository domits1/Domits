import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuoteAvailabilitySection from "../rendering/booking/QuoteAvailabilitySection";
import { WebsitePublicQuoteError, requestPublicWebsiteQuote } from "../services/websitePublicQuoteService";

jest.mock("../services/websitePublicQuoteService", () => {
  const actual = jest.requireActual("../services/websitePublicQuoteService");
  return { ...actual, requestPublicWebsiteQuote: jest.fn() };
});

jest.mock("../services/websiteVisitorId", () => ({
  getOrCreateVisitorId: () => "visitor-test",
}));

const padDatePart = (value) => String(value).padStart(2, "0");
const toKey = (date) => `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

// The panorama calendar shows the current and next month; next month is always fully visible.
const today = new Date();
const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const checkInDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
const checkOutDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 4);
const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(nextMonth);

const MODEL = {
  site: { title: "Cliff House" },
  stay: { guests: 4, minimumStay: 2 },
  host: { name: "Host", whatsapp: { isAvailable: false } },
  calendarSection: { title: "Availability", description: "Pick your dates.", showPanel: true },
  availability: {
    externalBlockedDates: [],
    unavailableDateKeys: [],
    blockedDateCount: 0,
    syncSummary: "",
    blockedDateSummary: "",
    callout: "",
  },
};

const QUOTE = {
  quoteId: "quote_1",
  nights: 3,
  guestCount: 2,
  priceBreakdown: { currency: "EUR", nightlyBaseTotal: 57000, cleaningFee: 5000, discounts: [], taxes: [], fees: [], total: 62000 },
  expiresAt: "2099-01-01T10:30:00.000Z",
  quoteToken: "qtok",
};

const renderSection = () =>
  render(
    <QuoteAvailabilitySection
      model={MODEL}
      siteId="site-1"
      variant="panorama"
      templateKey="panorama-landing"
      propertyTitle="Cliff House"
    />
  );

const selectStay = async () => {
  fireEvent.click(await screen.findByRole("button", { name: `${monthLabel} 1, Available` }));
  fireEvent.click(await screen.findByRole("button", { name: `${monthLabel} 4, Available` }));
};

describe("QuoteAvailabilitySection", () => {
  beforeEach(() => {
    requestPublicWebsiteQuote.mockReset();
  });

  it("lets a guest pick a stay on the calendar and fetch the server price", async () => {
    requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
    renderSection();

    await selectStay();
    expect(screen.getByText(/3 nights/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /check availability & price/i }));

    expect(await screen.findByText("€620.00")).toBeInTheDocument();
    expect(requestPublicWebsiteQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "site-1",
        checkIn: toKey(checkInDate),
        checkOut: toKey(checkOutDate),
        guests: 2,
        sessionId: "visitor-test",
      })
    );
  });

  it("marks the price stale when the selection changes afterwards", async () => {
    requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
    renderSection();

    await selectStay();
    fireEvent.click(screen.getByRole("button", { name: /check availability & price/i }));
    await screen.findByText("€620.00");

    fireEvent.click(screen.getByRole("button", { name: /add a guest/i }));

    expect(screen.getByText(/changed/i)).toBeInTheDocument();
  });

  it("clears the selection when the server reports the dates as unavailable", async () => {
    requestPublicWebsiteQuote.mockRejectedValue(
      new WebsitePublicQuoteError({ code: "unavailable_dates", message: "Taken.", status: 409, requestId: "req-1" })
    );
    renderSection();

    await selectStay();
    fireEvent.click(screen.getByRole("button", { name: /check availability & price/i }));

    await waitFor(() => expect(screen.getByText(/no longer available/i)).toBeInTheDocument());
    expect(screen.getByText(/select your check-in date/i)).toBeInTheDocument();
  });
});
