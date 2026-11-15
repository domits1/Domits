import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { PropertyReviewApiError, REVIEW_API_ERROR_CODE, fetchReviewDetail } from "../services/propertyReviewApi";
import PropertyReviewDetailPage from "./PropertyReviewDetailPage";

jest.mock("../services/propertyReviewApi", () => ({
  ...jest.requireActual("../services/propertyReviewApi"),
  fetchReviewDetail: jest.fn(),
}));

const UPDATED_AT = new Date(2026, 9, 30, 12).getTime();

const makeDetail = (overrides = {}) => ({
  property: {
    id: "p1",
    hostId: "host-1",
    title: "Canal house",
    subtitle: "Quiet street",
    description: "Bright rooms",
    status: "PENDING_REVIEW",
    updatedAt: UPDATED_AT,
  },
  location: {
    street: "Prinsengracht",
    houseNumber: 12,
    houseNumberExtension: "B",
    postalCode: "1015 DK",
    city: "Amsterdam",
    country: "Netherlands",
  },
  pricing: { roomRate: 1250, cleaning: 0 },
  ...overrides,
});

const renderAt = (propertyId) =>
  render(
    <MemoryRouter initialEntries={[`/detail/${propertyId}`]}>
      <Routes>
        <Route path="/detail/:propertyId" element={<PropertyReviewDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

const apiError = (code) => new PropertyReviewApiError(0, code, "x");

describe("PropertyReviewDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows a loading state while the listing loads", () => {
    fetchReviewDetail.mockReturnValue(new Promise(() => {}));

    renderAt("p1");

    expect(screen.getByText("Loading the listing…")).toBeTruthy();
    expect(fetchReviewDetail).toHaveBeenCalledWith("p1", { signal: expect.any(AbortSignal) });
  });

  test("shows the summary of the listing", async () => {
    fetchReviewDetail.mockResolvedValue(makeDetail());

    renderAt("p1");

    expect(await screen.findByRole("heading", { name: "Canal house" })).toBeTruthy();
    expect(screen.getByText("Quiet street")).toBeTruthy();
    expect(screen.getByText("Pending review")).toBeTruthy();
    expect(screen.getByText("host-1")).toBeTruthy();
    expect(screen.getByText("Prinsengracht 12B, 1015 DK Amsterdam, Netherlands")).toBeTruthy();
    expect(screen.getByText("EUR 1,250 / night")).toBeTruthy();
    expect(screen.getByText("EUR 0")).toBeTruthy();
    expect(screen.getByText("Bright rooms")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to the queue" }).getAttribute("href")).toBe(
      "/hostdashboard/admin/property-review"
    );
  });

  test("shows a dash for every missing field and for a missing cleaning fee", async () => {
    fetchReviewDetail.mockResolvedValue({
      property: { id: "p1" },
      location: null,
      pricing: { roomRate: 80, cleaning: null },
    });

    renderAt("p1");

    expect(await screen.findByRole("heading", { name: "—" })).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText("Drafted")).toBeTruthy();
  });

  test.each([
    [REVIEW_API_ERROR_CODE.NOT_FOUND, "This listing no longer exists."],
    [REVIEW_API_ERROR_CODE.FORBIDDEN, "Not authorized"],
    [REVIEW_API_ERROR_CODE.UNAUTHENTICATED, "Your session has expired. Please sign in again."],
  ])("shows %s without a retry button but with a way back", async (code, message) => {
    fetchReviewDetail.mockRejectedValue(apiError(code));

    renderAt("p1");

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to the queue" })).toBeTruthy();
  });

  test("offers a retry after a generic failure and shows the listing once it loads", async () => {
    fetchReviewDetail.mockRejectedValueOnce(apiError(REVIEW_API_ERROR_CODE.UNAVAILABLE));
    fetchReviewDetail.mockResolvedValueOnce(makeDetail());

    renderAt("p1");
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Canal house" })).toBeTruthy();
    expect(fetchReviewDetail).toHaveBeenCalledTimes(2);
  });

  test("aborts the request on unmount", () => {
    fetchReviewDetail.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderAt("p1");
    const { signal } = fetchReviewDetail.mock.calls[0][1];
    unmount();

    expect(signal.aborted).toBe(true);
  });

  test("drops the previous listing and aborts its request when the property id changes", async () => {
    fetchReviewDetail.mockResolvedValueOnce(makeDetail()).mockReturnValueOnce(new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={["/detail/p1"]}>
        <Link to="/detail/p2">Next listing</Link>
        <Routes>
          <Route path="/detail/:propertyId" element={<PropertyReviewDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByRole("heading", { name: "Canal house" });
    const firstSignal = fetchReviewDetail.mock.calls[0][1].signal;

    fireEvent.click(screen.getByRole("link", { name: "Next listing" }));

    expect(firstSignal.aborted).toBe(true);
    expect(screen.queryByRole("heading", { name: "Canal house" })).toBeNull();
    expect(screen.getByText("Loading the listing…")).toBeTruthy();
    expect(fetchReviewDetail).toHaveBeenLastCalledWith("p2", { signal: expect.any(AbortSignal) });
  });

  test("shows the review history under the facts", async () => {
    fetchReviewDetail.mockResolvedValue(
      makeDetail({
        history: [
          {
            id: "e1",
            action: "REJECTED",
            fromStatus: "PENDING_REVIEW",
            toStatus: "REJECTED",
            reason: "Photos are blurry",
            actorId: "admin-7",
            createdAt: UPDATED_AT,
          },
        ],
      })
    );

    renderAt("p1");

    expect(await screen.findByRole("heading", { name: "Review history" })).toBeTruthy();
    expect(screen.getByText("Admin admin-7")).toBeTruthy();
    expect(screen.getByRole("blockquote").textContent).toBe("Photos are blurry");
  });

  test("still renders a payload without history and shows the history fallback", async () => {
    fetchReviewDetail.mockResolvedValue(makeDetail());

    renderAt("p1");

    expect(await screen.findByRole("heading", { name: "Canal house" })).toBeTruthy();
    expect(screen.getByText("No review history yet.")).toBeTruthy();
  });
});
