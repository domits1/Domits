import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PropertyReviewApiError, REVIEW_API_ERROR_CODE, fetchReviewQueue } from "../services/propertyReviewApi";
import { S3_ACCOMMODATION_URL, placeholderImage } from "../../../../utils/accommodationImage";
import PropertyReviewQueue from "./PropertyReviewQueue";

jest.mock("../services/propertyReviewApi", () => ({
  ...jest.requireActual("../services/propertyReviewApi"),
  fetchReviewQueue: jest.fn(),
}));

const UPDATED_AT = new Date(2026, 9, 30, 12).getTime();

const makeCard = (id, overrides = {}) => ({
  property: { id, hostId: `host-${id}`, title: `Title ${id}`, status: "PENDING", createdAt: 1, updatedAt: UPDATED_AT },
  propertyImages: [{ thumb_key: `images/${id}/thumb.jpg` }],
  propertyLocation: { city: "Amsterdam", country: "Netherlands" },
  propertyPricing: { roomRate: 1250, weekendRate: 1, cleaning: 1 },
  propertyType: { property_type: "House", spaceType: "Entire place" },
  propertyTestStatus: { isTest: false },
  propertyGeneralDetails: [],
  ...overrides,
});

const page = (cards, nextCursor = null) => ({ properties: cards, nextCursor });
const apiError = (code) => new PropertyReviewApiError(0, code, "x");

const renderLoaded = async (firstPage) => {
  fetchReviewQueue.mockResolvedValueOnce(firstPage);
  render(<PropertyReviewQueue />);
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
};

describe("PropertyReviewQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows a loading state while the first page loads", () => {
    fetchReviewQueue.mockReturnValue(new Promise(() => {}));

    render(<PropertyReviewQueue />);

    expect(screen.getByRole("status").textContent).toContain("Loading");
  });

  test("shows the empty state only when there are no cards and no next cursor", async () => {
    await renderLoaded(page([]));

    expect(screen.getByText("No properties waiting for review.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  test("shows a load more button instead of the empty state when a page has no cards but a cursor", async () => {
    await renderLoaded(page([], "c1"));

    expect(screen.queryByText("No properties waiting for review.")).toBeNull();
    expect(screen.getByRole("button", { name: "Load more" })).toBeTruthy();
  });

  test("renders every field of a card", async () => {
    await renderLoaded(page([makeCard("p1")]));

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { name: "Title p1" })).toBeTruthy();
    expect(within(card).getByText("Amsterdam, Netherlands")).toBeTruthy();
    expect(within(card).getByText("House · Entire place")).toBeTruthy();
    expect(within(card).getByText("EUR 1,250 / night")).toBeTruthy();
    expect(within(card).getByText("Host host-p1")).toBeTruthy();
    expect(within(card).getByText("Updated 30 Oct 2026")).toBeTruthy();
    expect(within(card).getByRole("presentation").getAttribute("src")).toBe(`${S3_ACCOMMODATION_URL}images/p1/thumb.jpg`);
    expect(within(card).queryByText("Test listing")).toBeNull();
    expect(within(card).queryByRole("link")).toBeNull();
  });

  test("marks a test listing with a badge", async () => {
    await renderLoaded(page([makeCard("p1", { propertyTestStatus: { isTest: true } })]));

    expect(screen.getByText("Test listing")).toBeTruthy();
  });

  test("shows dashes and a placeholder photo for missing fields", async () => {
    const bare = {
      property: { id: "p1" },
      propertyImages: null,
      propertyLocation: null,
      propertyPricing: null,
      propertyType: null,
      propertyTestStatus: null,
    };
    await renderLoaded(page([bare]));

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading").textContent).toBe("—");
    expect(within(card).getByText("Host —")).toBeTruthy();
    expect(within(card).getByText("Updated —")).toBeTruthy();
    expect(within(card).getAllByText("—").length).toBeGreaterThanOrEqual(4);
    expect(within(card).getByRole("presentation").getAttribute("src")).toBe(placeholderImage);
    expect(within(card).queryByText("Test listing")).toBeNull();
  });

  test("load more appends cards without duplicating the ones already shown", async () => {
    await renderLoaded(page([makeCard("p1"), makeCard("p2")], "c1"));
    fetchReviewQueue.mockResolvedValueOnce(page([makeCard("p2"), makeCard("p3")]));

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Title p3")).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  test("disables load more while the next page is loading", async () => {
    await renderLoaded(page([makeCard("p1")], "c1"));
    fetchReviewQueue.mockReturnValueOnce(new Promise(() => {}));

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    const button = await screen.findByRole("button", { name: "Loading…" });
    expect(button.disabled).toBe(true);
  });

  test("shows an error with Retry when the first load fails, then loads on retry", async () => {
    fetchReviewQueue
      .mockRejectedValueOnce(apiError(REVIEW_API_ERROR_CODE.SERVER))
      .mockResolvedValueOnce(page([makeCard("p1")]));
    render(<PropertyReviewQueue />);

    expect(await screen.findByText("Could not load the queue.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Title p1")).toBeTruthy();
    expect(screen.queryByText("Could not load the queue.")).toBeNull();
  });

  test.each([
    [REVIEW_API_ERROR_CODE.UNAUTHENTICATED, "Your session has expired. Please sign in again."],
    [REVIEW_API_ERROR_CODE.FORBIDDEN, "Not authorized"],
  ])("shows %s without a Retry button", async (code, message) => {
    fetchReviewQueue.mockRejectedValue(apiError(code));
    render(<PropertyReviewQueue />);

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  test("a failed load more keeps the shown cards and offers an inline retry", async () => {
    await renderLoaded(page([makeCard("p1")], "c1"));
    fetchReviewQueue
      .mockRejectedValueOnce(apiError(REVIEW_API_ERROR_CODE.NETWORK))
      .mockResolvedValueOnce(page([makeCard("p2")]));

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Could not load the queue.")).toBeTruthy();
    expect(screen.getByText("Title p1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Title p2")).toBeTruthy();
    expect(fetchReviewQueue).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "c1" }));
    expect(screen.queryByText("Could not load the queue.")).toBeNull();
  });
});
