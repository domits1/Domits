import { act, renderHook, waitFor } from "@testing-library/react";
import useFetchBookingDetails from "./useFetchBookingDetails";
import { getHostBookingDetails } from "../services/messagingService";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(() => "host-token-1"),
}));

jest.mock("../services/messagingService", () => ({
  ...jest.requireActual("../services/messagingService"),
  getHostBookingDetails: jest.fn(),
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const bookingFor = (guestId) => ({
  bookingDetails: {
    id: `booking-${guestId}`,
    hostid: "host-1",
    guestid: guestId,
    property_id: `property-${guestId}`,
    arrivaldate: "2026-07-01",
    departuredate: "2026-07-04",
  },
  accommodation: { property: { title: `Cabin of ${guestId}` } },
});

const renderForThread = (guestId) =>
  renderHook(
    ({ threadGuestId }) =>
      useFetchBookingDetails("host-1", threadGuestId, {
        withAuth: true,
        accommodationEndpoint: "hostDashboard/single",
      }),
    { initialProps: { threadGuestId: guestId } }
  );

describe("useFetchBookingDetails when the open thread changes", () => {
  let requests;

  beforeEach(() => {
    jest.clearAllMocks();
    requests = {};
    getHostBookingDetails.mockImplementation(({ guestId }) => {
      requests[guestId] = deferred();
      return requests[guestId].promise;
    });
  });

  test("a late answer for the previous thread does not replace the open thread", async () => {
    const { result, rerender } = renderForThread("guest-1");
    rerender({ threadGuestId: "guest-2" });

    await act(async () => requests["guest-2"].resolve(bookingFor("guest-2")));
    await act(async () => requests["guest-1"].resolve(bookingFor("guest-1")));

    expect(result.current.bookingDetails.id).toBe("booking-guest-2");
    expect(result.current.accommodation.property.title).toBe("Cabin of guest-2");
  });

  test("a late failure for the previous thread does not clear the open thread", async () => {
    const { result, rerender } = renderForThread("guest-1");
    rerender({ threadGuestId: "guest-2" });

    await act(async () => requests["guest-2"].resolve(bookingFor("guest-2")));
    await act(async () => requests["guest-1"].reject(new Error("Failed to fetch accommodation")));

    expect(result.current.bookingDetails.id).toBe("booking-guest-2");
    expect(result.current.error).toBeNull();
  });

  test("the open thread keeps loading when the previous thread finishes first", async () => {
    const { result, rerender } = renderForThread("guest-1");
    rerender({ threadGuestId: "guest-2" });

    await act(async () => requests["guest-1"].resolve(bookingFor("guest-1")));

    expect(result.current.loading).toBe(true);
    expect(result.current.bookingDetails).toBeNull();
  });

  test("a failure for the open thread is reported", async () => {
    const { result } = renderForThread("guest-1");

    await act(async () => requests["guest-1"].reject(new Error("Failed to fetch accommodation")));

    expect(result.current.error).toBe("Failed to fetch accommodation");
    expect(result.current.loading).toBe(false);
    expect(result.current.bookingDetails).toBeNull();
  });

  test("the previous thread's booking is cleared while the next thread loads", async () => {
    const { result, rerender } = renderForThread("guest-1");
    await act(async () => requests["guest-1"].resolve(bookingFor("guest-1")));
    await waitFor(() => expect(result.current.bookingDetails?.id).toBe("booking-guest-1"));

    rerender({ threadGuestId: "guest-2" });

    expect(result.current.bookingDetails).toBeNull();
    expect(result.current.accommodation).toBeNull();
  });
});
