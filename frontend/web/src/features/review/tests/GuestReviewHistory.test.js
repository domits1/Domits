import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import GuestReviewHistory from "../GuestReviewHistory";
import { getGuestReviewHistory, getGuestReviewDetail } from "../services/reviewAPI";
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../services/reviewAPI", () => ({ getGuestReviewHistory: jest.fn(), getGuestReviewDetail: jest.fn() }));
let review;
beforeEach(() => {
  jest.clearAllMocks();
  review = { id: "r1", property_name: "Guest House", title: "Great stay", overall_rating: 5,
    public_review: "<b>Lovely</b>", created_at: Date.now() - 1000, status: "PUBLISHED", publication_status: "PUBLISHED",
    category_ratings: { cleanliness: 5 }, response: { message: "Thank you!" }, can_edit: true, edit_expires_at: Date.now() + 60000 };
  getGuestReviewHistory.mockResolvedValue({ reviews: [review], next_offset: null });
});
test("displays history safely and reuses the editing route", async () => {
  render(<GuestReviewHistory />);
  await screen.findByText("Guest House");
  expect(screen.getByText("Overall rating: 5/5")).toBeInTheDocument();
  expect(screen.getByText("<b>Lovely</b>").querySelector("b")).toBeNull();
  expect(screen.getByLabelText("Host response")).toHaveTextContent("Thank you!");
  fireEvent.click(screen.getByText("Edit review"));
  expect(mockNavigate).toHaveBeenCalledWith("/review?reviewId=r1");
});
test("opens expired details and retries a failed detail request", async () => {
  getGuestReviewHistory.mockResolvedValue({ reviews: [{ ...review, can_edit: false }], next_offset: null });
  getGuestReviewDetail.mockRejectedValueOnce(new Error("Details unavailable")).mockResolvedValueOnce({ ...review, can_edit: false });
  render(<GuestReviewHistory />);
  fireEvent.click(await screen.findByText("View details"));
  await screen.findByText("Details unavailable");
  fireEvent.click(screen.getByText("Retry details"));
  const details = screen.getByLabelText("Review details");
  await within(details).findByText("<b>Lovely</b>");
  expect(getGuestReviewDetail).toHaveBeenCalledWith("r1", expect.anything());
  expect(within(details).queryByText("Edit review")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Close details"));
  expect(screen.queryByLabelText("Review details")).not.toBeInTheDocument();
});
test("paginates and handles an empty page", async () => {
  getGuestReviewHistory.mockResolvedValueOnce({ reviews: [review], next_offset: 10 }).mockResolvedValueOnce({ reviews: [], next_offset: null });
  render(<GuestReviewHistory />);
  fireEvent.click(await screen.findByText("Next reviews"));
  await waitFor(() => expect(getGuestReviewHistory).toHaveBeenLastCalledWith(10, expect.anything()));
  expect(await screen.findByText("No reviews on this page.")).toBeInTheDocument();
  expect(screen.getByText("Previous reviews")).toBeInTheDocument();
});
test("retries history and displays its empty state", async () => {
  getGuestReviewHistory.mockRejectedValueOnce(new Error("Could not load history")).mockResolvedValueOnce({ reviews: [], next_offset: null });
  render(<GuestReviewHistory />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load history");
  fireEvent.click(screen.getByText("Retry history"));
  await screen.findByText("You haven’t submitted any reviews yet.");
});
test("hides the edit action when its permitted window expires", async () => {
  jest.useFakeTimers();
  try {
    review.edit_expires_at = Date.now() + 1000;
    render(<GuestReviewHistory />);
    await screen.findByText("Edit review");
    act(() => jest.advanceTimersByTime(1001));
    expect(screen.queryByText("Edit review")).not.toBeInTheDocument();
  } finally { jest.useRealTimers(); }
});
