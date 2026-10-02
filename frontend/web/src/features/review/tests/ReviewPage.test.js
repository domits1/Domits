import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Auth } from "aws-amplify";
import userEvent from "@testing-library/user-event";
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
jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: () => "access-token" }));

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
  expect(screen.getAllByRole("radio")[4].checked).toBe(true);
});

it.each([1, 2, 3, 4, 5])("selects and submits %s stars while retaining the selection during editing", async (rating) => {
  render(<ReviewPage />);
  const text = await screen.findByLabelText("Please justify your rating*");
  const radio = screen.getByRole("radio", { name: new RegExp(`^${rating} star`) });
  fireEvent.click(radio);
  fireEvent.change(text, { target: { value: "Great stay." } });
  fireEvent.change(screen.getByLabelText(/Do you have any feedback/), { target: { value: "Thanks!" } });
  expect(radio.checked).toBe(true);
  expect(screen.getByText(new RegExp(`^${rating} out of 5 stars`))).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
  await waitFor(() => expect(createReview).toHaveBeenCalledWith({
    reservationId: booking.id, rating, publicReview: "Great stay.", privateFeedback: "Thanks!",
  }));
});

it("shows a required rating error, focuses the input, and clears it after selection", async () => {
  render(<ReviewPage />);
  await screen.findByLabelText("Please justify your rating*");
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
  const radio = screen.getAllByRole("radio")[0];
  expect(screen.getByRole("alert").textContent).toContain("Please select an overall experience");
  expect(radio).toHaveAccessibleDescription(expect.stringContaining("Please select an overall experience"));
  expect(radio).toHaveFocus();
  expect(createReview).not.toHaveBeenCalled();
  fireEvent.click(radio);
  expect(screen.queryByRole("alert")).toBeNull();
});

it.each(["0", "6", "2.5", "invalid"])("prevents tampered rating %s from submission", async (value) => {
  render(<ReviewPage />);
  const text = await screen.findByLabelText("Please justify your rating*");
  const radio = screen.getAllByRole("radio")[0];
  radio.value = value;
  fireEvent.click(radio);
  fireEvent.change(text, { target: { value: "Great stay." } });
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
  expect(screen.getByRole("alert").textContent).toContain("Please select an overall experience");
  expect(createReview).not.toHaveBeenCalled();
});

it("supports keyboard selection and arrow navigation with native radios", async () => {
  const user = userEvent.setup();
  render(<ReviewPage />);
  await screen.findByRole("group", { name: "Overall experience (required)" });
  await user.tab();
  await user.keyboard(" ");
  expect(screen.getAllByRole("radio")[0].checked).toBe(true);
  await user.keyboard("{ArrowRight}");
  expect(screen.getAllByRole("radio")[1].checked).toBe(true);
  await user.keyboard("{ArrowLeft}");
  expect(screen.getAllByRole("radio")[0].checked).toBe(true);
});

it("maps the selected rating to overall_rating in the authenticated HTTP request", async () => {
  const api = jest.requireActual("../services/reviewAPI");
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, text: async () => JSON.stringify({ id: "review-1", overall_rating: 4 }),
  });
  try {
    const saved = await api.createReview({ reservationId: booking.id, rating: 4, publicReview: "Great stay.", privateFeedback: "" });
    const [url, request] = global.fetch.mock.calls[0];
    expect(url).toBe(api.API_REVIEW_BASE);
    expect(request.method).toBe("POST");
    expect(request.headers.Authorization).toBe("access-token");
    expect(JSON.parse(request.body)).toEqual({
      reservation_id: booking.id, overall_rating: 4, public_review: "Great stay.", private_feedback: "",
    });
    expect(saved.overall_rating).toBe(4);
  } finally {
    global.fetch = originalFetch;
  }
});
