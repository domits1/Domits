import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import QuotePanel from "../rendering/booking/QuotePanel";
import { QUOTE_STATUS } from "../rendering/booking/useWebsiteQuote";
import { BOOKING_REQUEST_STATUS } from "../rendering/booking/useWebsiteBookingRequest";

const QUOTE = {
  quoteId: "quote_1",
  nights: 4,
  guestCount: 2,
  priceBreakdown: {
    currency: "EUR",
    nightlyBaseTotal: 76000,
    cleaningFee: 5000,
    discounts: [],
    taxes: [],
    fees: [],
    total: 81000,
  },
  expiresAt: "2099-01-01T10:30:00.000Z",
  quoteToken: "qtok",
};

const COMPLETE_RANGE = { checkIn: "2026-10-10", checkOut: "2026-10-14" };
const IDLE = { status: QUOTE_STATUS.IDLE, quote: null, error: null, staleReason: null };

const renderPanel = (props = {}) => {
  const onRequestQuote = jest.fn();
  const onGuestsChange = jest.fn();
  const utils = render(
    <QuotePanel
      range={{ checkIn: null, checkOut: null }}
      guests={2}
      onGuestsChange={onGuestsChange}
      capacity={4}
      minimumStay={2}
      quoteState={IDLE}
      onRequestQuote={onRequestQuote}
      contactHref={null}
      {...props}
    />
  );
  return { ...utils, onRequestQuote, onGuestsChange };
};

const actionButton = () => screen.queryByRole("button", { name: /^check availability$/i });

describe("QuotePanel", () => {
  it("prompts for dates and keeps the action disabled until the range is complete", () => {
    renderPanel();
    expect(screen.getByText("Pick a check-in date")).toBeInTheDocument();
    expect(actionButton()).toBeDisabled();
  });

  it("asks for the check-out date after a check-in is chosen", () => {
    renderPanel({ range: { checkIn: "2026-10-10", checkOut: null } });
    expect(screen.getByText("Now pick a check-out date")).toBeInTheDocument();
    expect(actionButton()).toBeDisabled();
  });

  it("names the region after its heading", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: "Check availability & price" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Check availability & price" })).toBeInTheDocument();
  });

  it("summarises the stay and requests a quote when asked", () => {
    const { onRequestQuote } = renderPanel({ range: COMPLETE_RANGE });
    expect(screen.getByText(/4 nights/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum stay: 2 nights/i)).toBeInTheDocument();

    fireEvent.click(actionButton());
    expect(onRequestQuote).toHaveBeenCalledTimes(1);
  });

  it("shows a busy label while the quote loads", () => {
    renderPanel({ range: COMPLETE_RANGE, quoteState: { ...IDLE, status: QUOTE_STATUS.LOADING } });
    const button = screen.getByRole("button", { name: /checking/i });
    expect(button).toBeDisabled();
  });

  it("renders the server price breakdown and its validity", () => {
    renderPanel({ range: COMPLETE_RANGE, quoteState: { ...IDLE, status: QUOTE_STATUS.SUCCESS, quote: QUOTE } });
    expect(screen.getByText("€190.00 × 4 nights")).toBeInTheDocument();
    expect(screen.getByText("€50.00")).toBeInTheDocument();
    expect(screen.getByText("€810.00")).toBeInTheDocument();
    expect(screen.getByText(/^valid until/i)).toBeInTheDocument();
  });

  it("explains a stale quote after the selection changed or the price expired", () => {
    const { rerender } = renderPanel({
      range: COMPLETE_RANGE,
      quoteState: { ...IDLE, status: QUOTE_STATUS.STALE, quote: QUOTE, staleReason: "changed" },
    });
    expect(screen.getByText("Selection changed — check again")).toBeInTheDocument();

    rerender(
      <QuotePanel
        range={COMPLETE_RANGE}
        guests={2}
        onGuestsChange={jest.fn()}
        capacity={4}
        minimumStay={2}
        quoteState={{ ...IDLE, status: QUOTE_STATUS.STALE, quote: QUOTE, staleReason: "expired" }}
        onRequestQuote={jest.fn()}
        contactHref={null}
      />
    );
    expect(screen.getByText("Price expired — check again")).toBeInTheDocument();
  });

  it("puts date and guest errors next to the field they concern", () => {
    const { rerender } = renderPanel({
      range: COMPLETE_RANGE,
      quoteState: {
        ...IDLE,
        status: QUOTE_STATUS.ERROR,
        error: { code: "stay_restriction_violation", message: "At least 3 nights.", status: 409, requestId: "r" },
      },
    });
    expect(screen.getByText("At least 3 nights.")).toBeInTheDocument();

    rerender(
      <QuotePanel
        range={COMPLETE_RANGE}
        guests={5}
        onGuestsChange={jest.fn()}
        capacity={4}
        minimumStay={2}
        quoteState={{
          ...IDLE,
          status: QUOTE_STATUS.ERROR,
          error: { code: "invalid_guest_count", message: "Sleeps at most 4.", status: 400, requestId: "r" },
        }}
        onRequestQuote={jest.fn()}
        contactHref={null}
      />
    );
    expect(screen.getByText("Sleeps at most 4.")).toBeInTheDocument();
  });

  it("offers a retry for transient failures", () => {
    const { onRequestQuote } = renderPanel({
      range: COMPLETE_RANGE,
      quoteState: {
        ...IDLE,
        status: QUOTE_STATUS.ERROR,
        error: { code: "network_error", message: "", status: 0, requestId: "" },
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't check live pricing/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRequestQuote).toHaveBeenCalledTimes(1);
  });

  it("points at the host contact when the property cannot be quoted", () => {
    renderPanel({
      range: COMPLETE_RANGE,
      contactHref: "https://wa.me/31600000000",
      quoteState: {
        ...IDLE,
        status: QUOTE_STATUS.ERROR,
        error: { code: "quote_unavailable", message: "", status: 422, requestId: "req-1" },
      },
    });
    const contactLink = screen.getByRole("link", { name: /contact the host/i });
    expect(contactLink).toHaveAttribute("href", "https://wa.me/31600000000");
  });

  it("hides the action entirely when the site can no longer be quoted", () => {
    renderPanel({
      range: COMPLETE_RANGE,
      quoteState: {
        ...IDLE,
        status: QUOTE_STATUS.ERROR,
        error: { code: "site_suspended", message: "", status: 410, requestId: "req-1" },
      },
    });
    expect(actionButton()).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/isn't available/i);
  });

  it("shows the request reference for unexpected failures", () => {
    renderPanel({
      range: COMPLETE_RANGE,
      quoteState: {
        ...IDLE,
        status: QUOTE_STATUS.ERROR,
        error: { code: "internal_error", message: "", status: 500, requestId: "req-42" },
      },
    });
    expect(screen.getByText(/reference: req-42/i)).toBeInTheDocument();
  });

  it("clamps the guest stepper to capacity and reports changes", () => {
    const { onGuestsChange, rerender } = renderPanel({ guests: 1 });
    expect(screen.getByRole("button", { name: /remove a guest/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /add a guest/i }));
    expect(onGuestsChange).toHaveBeenCalledWith(2);

    rerender(
      <QuotePanel
        range={{ checkIn: null, checkOut: null }}
        guests={4}
        onGuestsChange={onGuestsChange}
        capacity={4}
        minimumStay={null}
        quoteState={IDLE}
        onRequestQuote={jest.fn()}
        contactHref={null}
      />
    );
    expect(screen.getByRole("button", { name: /add a guest/i })).toBeDisabled();
  });

  describe("booking request", () => {
    const QUOTED = { ...IDLE, status: QUOTE_STATUS.SUCCESS, quote: QUOTE };
    const NO_BOOKING = { status: BOOKING_REQUEST_STATUS.IDLE, result: null, error: null };
    const GUEST = { name: "Guest Name", email: "guest@example.com" };
    const RESULT = {
      publicBookingRef: "DBW-ABCDEFGHJK",
      status: "REQUESTED",
      siteId: "site-1",
      checkIn: "2026-10-10",
      checkOut: "2026-10-14",
      guests: 2,
      total: 81000,
      currency: "EUR",
    };
    const bookingError = (code, message = "", status = 400) => ({
      status: BOOKING_REQUEST_STATUS.ERROR,
      result: null,
      error: { code, message, status, requestId: "req-7" },
    });
    const requestButton = () => screen.queryByRole("button", { name: "Request to book" });

    const renderQuotedPanel = (props = {}) => {
      const onGuestChange = jest.fn();
      const onSubmitBookingRequest = jest.fn();
      const utils = renderPanel({
        range: COMPLETE_RANGE,
        quoteState: QUOTED,
        bookingState: NO_BOOKING,
        guest: GUEST,
        guestErrors: {},
        onGuestChange,
        onSubmitBookingRequest,
        ...props,
      });
      return { ...utils, onGuestChange, onSubmitBookingRequest };
    };

    it("only offers the request form once a fresh quote is on screen", () => {
      const { rerender } = renderQuotedPanel({ quoteState: IDLE });
      expect(requestButton()).not.toBeInTheDocument();

      rerender(
        <QuotePanel
          range={COMPLETE_RANGE}
          guests={2}
          onGuestsChange={jest.fn()}
          quoteState={{ ...IDLE, status: QUOTE_STATUS.STALE, quote: QUOTE, staleReason: "changed" }}
          onRequestQuote={jest.fn()}
          bookingState={NO_BOOKING}
          guest={GUEST}
          onGuestChange={jest.fn()}
          onSubmitBookingRequest={jest.fn()}
        />
      );
      expect(requestButton()).not.toBeInTheDocument();

      rerender(
        <QuotePanel
          range={COMPLETE_RANGE}
          guests={2}
          onGuestsChange={jest.fn()}
          quoteState={QUOTED}
          onRequestQuote={jest.fn()}
          bookingState={NO_BOOKING}
          guest={GUEST}
          onGuestChange={jest.fn()}
          onSubmitBookingRequest={jest.fn()}
        />
      );
      expect(requestButton()).toBeInTheDocument();
      expect(screen.getByText("€810.00")).toBeInTheDocument();
    });

    it("hands the guest details and the submit up to the section", () => {
      const { onGuestChange, onSubmitBookingRequest } = renderQuotedPanel();

      fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Someone Else" } });
      expect(onGuestChange).toHaveBeenCalledWith("name", "Someone Else");

      fireEvent.click(requestButton());
      expect(onSubmitBookingRequest).toHaveBeenCalledTimes(1);
    });

    it("replaces the panel body with the confirmation after a successful request", () => {
      renderQuotedPanel({ bookingState: { status: BOOKING_REQUEST_STATUS.SUCCESS, result: RESULT, error: null } });

      expect(screen.getByRole("status")).toHaveTextContent("Request sent");
      expect(screen.getByText("DBW-ABCDEFGHJK")).toBeInTheDocument();
      expect(screen.getByText(/still has to confirm/i)).toBeInTheDocument();
      expect(screen.getByText(/guest@example\.com/)).toBeInTheDocument();
      expect(screen.getByText("€810.00")).toBeInTheDocument();
      expect(actionButton()).not.toBeInTheDocument();
      expect(requestButton()).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /add a guest/i })).not.toBeInTheDocument();
    });

    it("shows a rejected contact on the form", () => {
      renderQuotedPanel({ bookingState: bookingError("invalid_guest_contact", "Please provide a valid email.") });
      expect(screen.getByRole("alert")).toHaveTextContent("Please provide a valid email.");
      expect(requestButton()).toBeInTheDocument();
    });

    it("explains a refreshed price above the form", () => {
      renderQuotedPanel({ bookingState: bookingError("quote_expired", "", 409) });
      expect(screen.getByText(/price changed/i)).toBeInTheDocument();
      expect(requestButton()).toBeInTheDocument();
    });

    it("offers a retry that resubmits the same request", () => {
      const { onSubmitBookingRequest } = renderQuotedPanel({ bookingState: bookingError("network_error", "", 0) });
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't send your request/i);
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      expect(onSubmitBookingRequest).toHaveBeenCalledTimes(1);
    });

    it("shows the reference for an unexpected failure", () => {
      renderQuotedPanel({ bookingState: bookingError("internal_error", "", 500) });
      expect(screen.getByText(/reference: req-7/i)).toBeInTheDocument();
    });

    it("hides the form when the site can no longer take requests", () => {
      renderQuotedPanel({ bookingState: bookingError("site_suspended", "", 410) });
      expect(requestButton()).not.toBeInTheDocument();
      expect(actionButton()).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/isn't available/i);
    });

    it("locks the form while the request is being sent", () => {
      renderQuotedPanel({ bookingState: { status: BOOKING_REQUEST_STATUS.SUBMITTING, result: null, error: null } });
      expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
      expect(screen.getByLabelText("Your name")).toBeDisabled();
    });
  });
});
