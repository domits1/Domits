import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import QuoteAvailabilitySection from "../rendering/booking/QuoteAvailabilitySection";
import { WebsitePublicQuoteError, requestPublicWebsiteQuote } from "../services/websitePublicQuoteService";
import { WebsitePublicBookingError, requestPublicSiteBooking } from "../services/websitePublicBookingService";
import "../rendering/AvailabilityCalendarPreview";

jest.mock("../services/websitePublicQuoteService", () => {
  const actual = jest.requireActual("../services/websitePublicQuoteService");
  return { ...actual, requestPublicWebsiteQuote: jest.fn() };
});

jest.mock("../services/websiteVisitorId", () => ({
  getOrCreateVisitorId: () => "visitor-test",
}));

jest.mock("../services/websitePublicBookingService", () => {
  const actual = jest.requireActual("../services/websitePublicBookingService");
  return { ...actual, requestPublicSiteBooking: jest.fn() };
});

const padDatePart = (value) => String(value).padStart(2, "0");
const toKey = (date) => `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

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
  priceBreakdown: {
    currency: "EUR",
    nightlyBaseTotal: 57000,
    cleaningFee: 5000,
    discounts: [],
    taxes: [],
    fees: [],
    total: 62000,
  },
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

const waitForCalendar = () => screen.findByRole("button", { name: "Show next months" });

const selectStay = async () => {
  await waitForCalendar();
  fireEvent.click(screen.getByRole("button", { name: `${monthLabel} 1, Available` }));
  fireEvent.click(screen.getByRole("button", { name: `${monthLabel} 4, Available` }));
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

    fireEvent.click(screen.getByRole("button", { name: /^check availability$/i }));

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
    fireEvent.click(screen.getByRole("button", { name: /^check availability$/i }));
    await screen.findByText("€620.00");

    fireEvent.click(screen.getByRole("button", { name: /add a guest/i }));

    expect(screen.getByText("Selection changed — check again")).toBeInTheDocument();
  });

  it("clears the selection when the server reports the dates as unavailable", async () => {
    requestPublicWebsiteQuote.mockRejectedValue(
      new WebsitePublicQuoteError({ code: "unavailable_dates", message: "Taken.", status: 409, requestId: "req-1" })
    );
    renderSection();

    await selectStay();
    fireEvent.click(screen.getByRole("button", { name: /^check availability$/i }));

    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument();
    expect(screen.getByText("Pick a check-in date")).toBeInTheDocument();
  });

  describe("booking request", () => {
    const FRESH_QUOTE = {
      ...QUOTE,
      quoteId: "quote_2",
      quoteToken: "qtok2",
      priceBreakdown: { ...QUOTE.priceBreakdown, nightlyBaseTotal: 60000, total: 65000 },
    };
    const RESULT = {
      publicBookingRef: "DBW-ABCDEFGHJK",
      status: "REQUESTED",
      siteId: "site-1",
      checkIn: toKey(checkInDate),
      checkOut: toKey(checkOutDate),
      guests: 2,
      total: 62000,
      currency: "EUR",
    };
    const bookingError = (code, status) =>
      new WebsitePublicBookingError({ code, message: "", status, requestId: "req-1" });

    const getQuote = async () => {
      await selectStay();
      fireEvent.click(screen.getByRole("button", { name: /^check availability$/i }));
      await screen.findByText("€620.00");
    };

    const fillContact = () => {
      fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Guest Name" } });
      fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "guest@example.com" } });
    };

    const submitRequest = () => fireEvent.click(screen.getByRole("button", { name: "Request to book" }));

    beforeEach(() => {
      requestPublicSiteBooking.mockReset();
      globalThis.localStorage.clear();
    });

    it("sends the quoted stay with the guest's details and shows the booking reference", async () => {
      requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
      requestPublicSiteBooking.mockResolvedValue(RESULT);
      renderSection();

      await getQuote();
      fillContact();
      submitRequest();

      expect(await screen.findByText("Request sent")).toBeInTheDocument();
      expect(screen.getByText("DBW-ABCDEFGHJK")).toBeInTheDocument();
      expect(screen.getByText(/still has to confirm/i)).toBeInTheDocument();
      expect(requestPublicSiteBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          siteId: "site-1",
          quoteToken: "qtok",
          guest: { name: "Guest Name", email: "guest@example.com" },
          sessionId: "visitor-test",
          idempotencyKey: expect.any(String),
        })
      );
    });

    it("validates the contact details before calling the endpoint", async () => {
      requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
      renderSection();

      await getQuote();
      fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "not-an-email" } });
      submitRequest();

      expect(screen.getByText("Please enter your name.")).toBeInTheDocument();
      expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
      expect(requestPublicSiteBooking).not.toHaveBeenCalled();
    });

    it("re-quotes automatically when the price changed and keeps the guest's details", async () => {
      requestPublicWebsiteQuote.mockResolvedValueOnce(QUOTE).mockResolvedValueOnce(FRESH_QUOTE);
      requestPublicSiteBooking.mockRejectedValue(bookingError("quote_expired", 409));
      renderSection();

      await getQuote();
      fillContact();
      submitRequest();

      expect(await screen.findByText("€650.00")).toBeInTheDocument();
      expect(screen.getByText(/price changed/i)).toBeInTheDocument();
      expect(requestPublicWebsiteQuote).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText("Your name")).toHaveValue("Guest Name");
      expect(screen.getByRole("button", { name: "Request to book" })).toBeInTheDocument();
    });

    it("clears the selection and blocks the dates when they were taken meanwhile", async () => {
      requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
      requestPublicSiteBooking.mockRejectedValue(bookingError("unavailable_dates", 409));
      renderSection();

      await getQuote();
      fillContact();
      submitRequest();

      expect(await screen.findByText(/no longer available/i)).toBeInTheDocument();
      expect(screen.getByText("Pick a check-in date")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${monthLabel} 1,`) }));
      expect(screen.getByText("Pick a check-in date")).toBeInTheDocument();
    });

    it("retries with the same key after a transient failure", async () => {
      requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
      requestPublicSiteBooking.mockRejectedValueOnce(bookingError("network_error", 0)).mockResolvedValueOnce(RESULT);
      renderSection();

      await getQuote();
      fillContact();
      submitRequest();

      expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't send your request/i);
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      expect(await screen.findByText("Request sent")).toBeInTheDocument();
      const [firstCall, secondCall] = requestPublicSiteBooking.mock.calls;
      expect(secondCall[0].idempotencyKey).toBe(firstCall[0].idempotencyKey);
    });

    it("asks for a fresh availability check when the token is rejected", async () => {
      requestPublicWebsiteQuote.mockResolvedValue(QUOTE);
      requestPublicSiteBooking.mockRejectedValue(bookingError("quote_token_invalid", 401));
      renderSection();

      await getQuote();
      fillContact();
      submitRequest();

      expect(await screen.findByText(/check availability again/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Request to book" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^check availability$/i })).toBeEnabled();
    });
  });
});
