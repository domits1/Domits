import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Auth } from "aws-amplify";
import ReviewPage from "../ReviewPage";
import { getGuestBookings } from "../../guestdashboard/services/bookingAPI";
import { createReview } from "../services/reviewAPI";

const mockNavigate = jest.fn();
let mockSearch;

jest.mock("aws-amplify", () => ({
  Auth: { currentUserInfo: jest.fn() },
}));
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: mockSearch, state: null }),
}));
jest.mock("../../guestdashboard/services/bookingAPI", () => ({
  getGuestBookings: jest.fn(),
}));
jest.mock("../services/reviewAPI", () => ({
  createReview: jest.fn(),
}));

const booking = {
  id: "reservation-1",
  guestid: "guest-1",
  status: "Paid",
  departuredate: Date.now() - 60000,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = "?reservationId=reservation-1";
  Auth.currentUserInfo.mockResolvedValue({ attributes: { sub: booking.guestid } });
  getGuestBookings.mockResolvedValue([{ ...booking }]);
  createReview.mockResolvedValue({ id: "review-1" });
});

it("hides the form while eligibility is being checked", () => {
  getGuestBookings.mockReturnValue(new Promise(() => {}));
  render(<ReviewPage />);
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
});

it.each([
  { status: "Paid", departuredate: Date.now() + 86400000 },
  { status: "Declined" },
  { status: "Awaiting Payment" },
  { status: "Cancelled" },
  { departuredate: "invalid" },
  { guestid: "another-guest" },
])("hides the form for an ineligible booking: %o", async (changes) => {
  getGuestBookings.mockResolvedValue([{ ...booking, ...changes }]);
  render(<ReviewPage />);
  await screen.findByRole("heading", { name: "Review unavailable" });
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(createReview).not.toHaveBeenCalled();
});

it("rejects direct URLs without a reservation", async () => {
  mockSearch = "";
  render(<ReviewPage />);
  await screen.findByRole("heading", { name: "Review unavailable" });
  expect(getGuestBookings).not.toHaveBeenCalled();
});

it("redirects unauthenticated guests without displaying the form", async () => {
  Auth.currentUserInfo.mockResolvedValue(null);
  render(<ReviewPage />);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(getGuestBookings).not.toHaveBeenCalled();
});

it("fails closed when the reservation cannot be loaded", async () => {
  getGuestBookings.mockRejectedValue(new Error("Server error"));
  render(<ReviewPage />);
  await screen.findByRole("heading", { name: "Review unavailable" });
  expect(screen.getByRole("alert").textContent).toContain("Could not verify");
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
});

const submitReview = async () => {
  render(<ReviewPage />);
  const textArea = await screen.findByLabelText("Please justify your rating*");
  fireEvent.click(screen.getAllByRole("radio")[4]);
  fireEvent.change(textArea, { target: { value: "Great stay." } });
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
};

it("submits the reservation and shows confirmation", async () => {
  await submitReview();
  await screen.findByRole("heading", { name: "Review submitted" });
  expect(createReview).toHaveBeenCalledWith({
    reservationId: booking.id,
    rating: 5,
    publicReview: "Great stay.",
    privateFeedback: "",
  });
});

it.each([
  "This reservation already has a review.",
  "Could not submit your review. Please try again.",
])("shows submission failures without confirming success: %s", async (message) => {
  createReview.mockRejectedValue(new Error(message));
  await submitReview();
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(message));
  expect(screen.queryByRole("heading", { name: "Review submitted" })).toBeNull();
});
