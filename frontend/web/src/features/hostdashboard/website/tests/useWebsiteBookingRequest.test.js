import { act, renderHook } from "@testing-library/react";
import { BOOKING_REQUEST_STATUS, useWebsiteBookingRequest } from "../rendering/booking/useWebsiteBookingRequest";
import { WebsitePublicBookingError, requestPublicSiteBooking } from "../services/websitePublicBookingService";
import { resolveBookingIdempotencyStorageKey } from "../rendering/booking/bookingRequestIdempotency";

jest.mock("../services/websitePublicBookingService", () => {
  const actual = jest.requireActual("../services/websitePublicBookingService");
  return { ...actual, requestPublicSiteBooking: jest.fn() };
});

const QUOTE = {
  quoteId: "quote_1",
  quoteToken: "qtok_abc",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guestCount: 2,
};
const GUEST = { name: "Guest Name", email: "guest@example.com" };
const RESULT = {
  publicBookingRef: "DBW-ABCDEFGHJK",
  status: "REQUESTED",
  siteId: "site-1",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guests: 2,
  total: 81000,
  currency: "EUR",
};

const bookingError = (code, status = 400) =>
  new WebsitePublicBookingError({ code, message: "", status, requestId: "req-1" });

const sentIdempotencyKeys = () => requestPublicSiteBooking.mock.calls.map(([request]) => request.idempotencyKey);

const renderBookingHook = () =>
  renderHook(() => useWebsiteBookingRequest({ siteId: "site-1", sessionId: "visitor-1" }));

describe("useWebsiteBookingRequest", () => {
  beforeEach(() => {
    requestPublicSiteBooking.mockReset();
    globalThis.localStorage.clear();
  });

  it("submits the quote token with the guest, session and a generated Idempotency-Key", async () => {
    requestPublicSiteBooking.mockResolvedValue(RESULT);
    const { result } = renderBookingHook();

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });

    expect(requestPublicSiteBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "site-1",
        quoteToken: "qtok_abc",
        guest: GUEST,
        sessionId: "visitor-1",
        idempotencyKey: expect.any(String),
      })
    );
    expect(result.current.status).toBe(BOOKING_REQUEST_STATUS.SUCCESS);
    expect(result.current.result).toEqual(RESULT);
  });

  it("clears the stored key once the request succeeded", async () => {
    requestPublicSiteBooking.mockResolvedValue(RESULT);
    const { result } = renderBookingHook();

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });

    expect(globalThis.localStorage.getItem(resolveBookingIdempotencyStorageKey("site-1"))).toBeNull();
  });

  it("reuses the same key when the guest retries after a transient failure", async () => {
    requestPublicSiteBooking.mockRejectedValueOnce(bookingError("network_error", 0)).mockResolvedValueOnce(RESULT);
    const { result } = renderBookingHook();

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });
    expect(result.current.status).toBe(BOOKING_REQUEST_STATUS.ERROR);
    expect(result.current.error).toMatchObject({ code: "network_error" });

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });

    const [firstKey, secondKey] = sentIdempotencyKeys();
    expect(secondKey).toBe(firstKey);
    expect(result.current.status).toBe(BOOKING_REQUEST_STATUS.SUCCESS);
  });

  it("uses a new key for a new quote", async () => {
    requestPublicSiteBooking.mockRejectedValueOnce(bookingError("quote_expired", 409)).mockResolvedValueOnce(RESULT);
    const { result } = renderBookingHook();

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });
    await act(async () => {
      await result.current.submitBookingRequest({
        quote: { ...QUOTE, quoteId: "quote_2", quoteToken: "qtok_def" },
        guest: GUEST,
      });
    });

    const [firstKey, secondKey] = sentIdempotencyKeys();
    expect(secondKey).not.toBe(firstKey);
  });

  it("rotates the key and retries once when the server says the key was reused", async () => {
    requestPublicSiteBooking
      .mockRejectedValueOnce(bookingError("idempotency_key_reused", 422))
      .mockResolvedValueOnce(RESULT);
    const { result } = renderBookingHook();

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });

    expect(requestPublicSiteBooking).toHaveBeenCalledTimes(2);
    const [firstKey, secondKey] = sentIdempotencyKeys();
    expect(secondKey).not.toBe(firstKey);
    expect(result.current.status).toBe(BOOKING_REQUEST_STATUS.SUCCESS);
  });

  it("gives up after one key rotation", async () => {
    requestPublicSiteBooking.mockRejectedValue(bookingError("idempotency_key_reused", 422));
    const { result } = renderBookingHook();

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });

    expect(requestPublicSiteBooking).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe(BOOKING_REQUEST_STATUS.ERROR);
    expect(result.current.error).toMatchObject({ code: "idempotency_key_reused" });
  });

  it("returns the error to the caller and exposes it as state", async () => {
    requestPublicSiteBooking.mockRejectedValue(bookingError("unavailable_dates", 409));
    const { result } = renderBookingHook();

    let outcome;
    await act(async () => {
      outcome = await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });

    expect(outcome).toMatchObject({ ok: false, error: { code: "unavailable_dates" } });
    expect(result.current.error).toMatchObject({ code: "unavailable_dates" });
  });

  it("wraps a non-service failure as unexpected_response", async () => {
    requestPublicSiteBooking.mockRejectedValue(new Error("boom"));
    const { result } = renderBookingHook();

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });

    expect(result.current.error).toMatchObject({ code: "unexpected_response" });
  });

  it("resets back to idle", async () => {
    requestPublicSiteBooking.mockRejectedValue(bookingError("network_error", 0));
    const { result } = renderBookingHook();

    await act(async () => {
      await result.current.submitBookingRequest({ quote: QUOTE, guest: GUEST });
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe(BOOKING_REQUEST_STATUS.IDLE);
    expect(result.current.error).toBeNull();
  });
});
