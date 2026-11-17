import { act, renderHook } from "@testing-library/react";
import { QUOTE_STALE_REASONS, QUOTE_STATUS, useWebsiteQuote } from "../rendering/booking/useWebsiteQuote";
import { requestPublicWebsiteQuote } from "../services/websitePublicQuoteService";

jest.mock("../services/websitePublicQuoteService", () => {
  const actual = jest.requireActual("../services/websitePublicQuoteService");
  return { ...actual, requestPublicWebsiteQuote: jest.fn() };
});

const STAY = { checkIn: "2026-10-01", checkOut: "2026-10-04", guests: 2 };
const QUOTE = {
  quoteId: "quote_1",
  checkIn: STAY.checkIn,
  checkOut: STAY.checkOut,
  guestCount: STAY.guests,
  nights: 3,
  priceBreakdown: { currency: "EUR", nightlyBaseTotal: 57000, cleaningFee: 5000, total: 62000 },
  expiresAt: "2099-01-01T10:30:00.000Z",
  quoteToken: "qtok",
};

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const renderQuoteHook = () => renderHook(() => useWebsiteQuote({ siteId: "site-1", sessionId: "visitor-test" }));

describe("useWebsiteQuote selection changes", () => {
  beforeEach(() => {
    requestPublicWebsiteQuote.mockReset();
  });

  it("aborts an in-flight request and discards its late response after the selection changed", async () => {
    const pending = deferred();
    requestPublicWebsiteQuote.mockReturnValue(pending.promise);
    const { result } = renderQuoteHook();

    let request;
    act(() => {
      request = result.current.requestQuote(STAY);
    });
    expect(result.current.status).toBe(QUOTE_STATUS.LOADING);

    act(() => result.current.notifySelectionChanged());

    expect(requestPublicWebsiteQuote.mock.calls[0][0].signal.aborted).toBe(true);
    expect(result.current.status).toBe(QUOTE_STATUS.IDLE);

    await act(async () => {
      pending.resolve(QUOTE);
      await expect(request).resolves.toEqual({ ok: false, aborted: true });
    });

    expect(result.current.status).toBe(QUOTE_STATUS.IDLE);
    expect(result.current.quote).toBeNull();
  });

  it("keeps the earlier quote stale when a re-quote is interrupted by a selection change", async () => {
    requestPublicWebsiteQuote.mockResolvedValueOnce(QUOTE);
    const { result } = renderQuoteHook();
    await act(async () => {
      await result.current.requestQuote(STAY);
    });
    expect(result.current.status).toBe(QUOTE_STATUS.SUCCESS);

    const pending = deferred();
    requestPublicWebsiteQuote.mockReturnValueOnce(pending.promise);
    let request;
    act(() => {
      request = result.current.requestQuote(STAY);
    });
    act(() => result.current.notifySelectionChanged());

    await act(async () => {
      pending.resolve({ ...QUOTE, quoteId: "quote_2", quoteToken: "qtok2" });
      await request;
    });

    expect(result.current.status).toBe(QUOTE_STATUS.STALE);
    expect(result.current.staleReason).toBe(QUOTE_STALE_REASONS.CHANGED);
    expect(result.current.quote.quoteId).toBe("quote_1");
  });
});
