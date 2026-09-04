import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import QuotePanel from "../rendering/booking/QuotePanel";
import { QUOTE_STATUS } from "../rendering/booking/useWebsiteQuote";

const QUOTE = {
  quoteId: "quote_1",
  nights: 4,
  guestCount: 2,
  priceBreakdown: { currency: "EUR", nightlyBaseTotal: 76000, cleaningFee: 5000, discounts: [], taxes: [], fees: [], total: 81000 },
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

const actionButton = () => screen.queryByRole("button", { name: /check availability & price/i });

describe("QuotePanel", () => {
  it("prompts for dates and keeps the action disabled until the range is complete", () => {
    renderPanel();
    expect(screen.getByText(/select your check-in date/i)).toBeInTheDocument();
    expect(actionButton()).toBeDisabled();
  });

  it("asks for the check-out date after a check-in is chosen", () => {
    renderPanel({ range: { checkIn: "2026-10-10", checkOut: null } });
    expect(screen.getByText(/pick your check-out date/i)).toBeInTheDocument();
    expect(actionButton()).toBeDisabled();
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
    expect(screen.getByText(/price valid until/i)).toBeInTheDocument();
  });

  it("explains a stale quote after the selection changed or the price expired", () => {
    const { rerender } = renderPanel({
      range: COMPLETE_RANGE,
      quoteState: { ...IDLE, status: QUOTE_STATUS.STALE, quote: QUOTE, staleReason: "changed" },
    });
    expect(screen.getByText(/changed/i)).toBeInTheDocument();

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
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
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
});
