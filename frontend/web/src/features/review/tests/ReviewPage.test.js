import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Auth } from "aws-amplify";
import userEvent from "@testing-library/user-event";
import ReviewPage from "../ReviewPage";
import { getGuestBookings } from "../../guestdashboard/services/bookingAPI";

import { createReview, requestReview, getEditableReview, updateReview } from "../services/reviewAPI";

import GuestReviews from "../../guestdashboard/GuestReviews";
import { createReview, requestReview } from "../services/reviewAPI";




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
  requestReview: jest.fn(),
  getEditableReview: jest.fn(),
  updateReview: jest.fn(),
}));
jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: () => "access-token" }));

const booking = {
  id: "reservation-1",
  guestid: "guest-1",
  status: "Paid",
  departuredate: Date.now() - 60000,
};

it.each([false, true])("prefills editing and preserves changes on failure: %s", async (fails) => {
  mockSearch = "?reviewId=review-1";
  getEditableReview.mockResolvedValue({ id: "review-1", overall_rating: 4,
    public_review: "Original\nreview", updated_at: 123 });
  updateReview.mockImplementation(async () => { if (fails) throw new Error("Editing period ended."); });
  render(<ReviewPage />);
  const textarea = await screen.findByLabelText("Written review (required)");
  expect(textarea).toHaveValue("Original\nreview");
  expect(screen.getAllByRole("radio")[3]).toBeChecked();
  expect(getGuestBookings).not.toHaveBeenCalled();
  fireEvent.change(textarea, { target: { value: "Updated review" } });
  fireEvent.click(screen.getAllByRole("radio")[4]);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(updateReview).toHaveBeenCalledWith({ reviewId: "review-1",
    rating: 5, publicReview: "Updated review", updatedAt: 123 }));
  if (fails) {
    await screen.findByText("Editing period ended.");
  } else await screen.findByRole("heading", { name: "Review updated" });
  expect(screen.queryByLabelText("Written review (required)")?.value).toBe(fails ? "Updated review" : undefined);
  expect(createReview).not.toHaveBeenCalled();
});

it("shows the server's edit eligibility error", async () => {
  mockSearch = "?reviewId=review-1";
  getEditableReview.mockRejectedValue(new Error("You can only edit your own reviews."));
  render(<ReviewPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("You can only edit your own reviews.");
  expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
});

it.each(["", " \n\t ", "x".repeat(501), "Stay\u0000"])(
  "shows a field error for invalid written content: %p", async (value) => {
    render(<ReviewPage />);
    const textarea = await screen.findByLabelText("Written review (required)");
  fireEvent.change(screen.getByLabelText("Review title (required)"), { target: { value: "Great stay" } });
    fireEvent.click(screen.getAllByRole("radio")[4]);
    fireEvent.change(textarea, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveFocus();
    expect(createReview).not.toHaveBeenCalled();
  }
);

it.each(["x", "x".repeat(500), "Quiet room.\nBusy street.", "Café 😊 & O'Brien < 10"])(
  "submits valid written content without losing special characters: %p", async (value) => {
    render(<ReviewPage />);
    const textarea = await screen.findByLabelText("Written review (required)");
  fireEvent.change(screen.getByLabelText("Review title (required)"), { target: { value: "Great stay" } });
    fireEvent.click(screen.getAllByRole("radio")[4]);
    fireEvent.change(textarea, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
    await waitFor(() => expect(createReview).toHaveBeenCalledWith(expect.objectContaining({
      bookingId: booking.id, publicReview: value,
    })));
  }
);

it("preserves written content when rating validation or submission fails", async () => {
  createReview.mockRejectedValue(new Error("Please try again."));
  render(<ReviewPage />);
  const textarea = await screen.findByLabelText("Written review (required)");
  fireEvent.change(screen.getByLabelText("Review title (required)"), { target: { value: "Great stay" } });
  const value = "Quiet room.\nBusy street.";
  fireEvent.change(textarea, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
  expect(textarea).toHaveValue(value);
  expect(createReview).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("radio")[4]);
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
  await screen.findByText("Please try again.");
  expect(textarea).toHaveValue(value);
});

it.each([true, false])("renders plain text and gates the edit action: %s", async (can_edit) => {
  const content = "<img src=x alt=unsafe onerror=alert(1)>";
  requestReview.mockImplementation(async (_method, query) => ({
    ok: true, json: async () => query.scope === "written"
      ? [{ id: "review-1", title: "Overall experience: 4/5", content, date: Date.now(),
        can_edit, edit_expires_at: Date.now() + 60000 }] : [],
  }));
  render(<GuestReviews />);
  expect(await screen.findByText(content)).toBeTruthy();
  expect(screen.queryByRole("img", { name: "unsafe" })).toBeNull();
  expect(Boolean(screen.queryByRole("button", { name: "Edit review" }))).toBe(can_edit);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = "?bookingId=reservation-1";
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
  const textArea = await screen.findByLabelText("Written review (required)");
  fireEvent.click(screen.getAllByRole("radio")[4]);
  fireEvent.change(screen.getByLabelText("Review title (required)"), { target: { value: "Great stay" } });
  fireEvent.change(textArea, { target: { value: "Great stay." } });
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
};

it("submits the reservation and shows confirmation", async () => {
  await submitReview();
  await screen.findByRole("heading", { name: "Review submitted" });
  expect(createReview).toHaveBeenCalledWith({
    bookingId: booking.id,
    rating: 5,
    title: "Great stay",
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
  const text = await screen.findByLabelText("Written review (required)");
  const radio = screen.getByRole("radio", { name: new RegExp(`^${rating} star`) });
  fireEvent.click(radio);
  fireEvent.change(screen.getByLabelText("Review title (required)"), { target: { value: "Great stay" } });
  fireEvent.change(text, { target: { value: "Great stay." } });
  fireEvent.change(screen.getByLabelText(/Do you have any feedback/), { target: { value: "Thanks!" } });
  expect(radio.checked).toBe(true);
  expect(screen.getByText(new RegExp(`^${rating} out of 5 stars`))).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
  await waitFor(() => expect(createReview).toHaveBeenCalledWith({
    bookingId: booking.id, rating, title: "Great stay", publicReview: "Great stay.", privateFeedback: "Thanks!",
  }));
});

it("shows a required rating error, focuses the input, and clears it after selection", async () => {
  render(<ReviewPage />);
  await screen.findByLabelText("Written review (required)");
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
  const text = await screen.findByLabelText("Written review (required)");
  const radio = screen.getAllByRole("radio")[0];
  radio.value = value;
  fireEvent.click(radio);
  fireEvent.change(screen.getByLabelText("Review title (required)"), { target: { value: "Great stay" } });
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
    const saved = await api.createReview({ bookingId: booking.id, rating: 4, title: "Great stay", publicReview: "Great stay.", privateFeedback: "" });
    const [url, request] = global.fetch.mock.calls[0];
    expect(url).toBe(`${api.API_REVIEW_BASE}/reviews`);
    expect(request.method).toBe("POST");
    expect(request.headers.Authorization).toBe("access-token");
    expect(JSON.parse(request.body)).toEqual({
      booking_id: booking.id, overall_rating: 4, title: "Great stay", public_review: "Great stay.", private_feedback: "",
    });
    expect(saved.overall_rating).toBe(4);
  } finally {
    global.fetch = originalFetch;
  }
});

it.each(["GET", "DELETE"])("uses the authenticated review endpoint for web %s", async (method) => {
  const web = jest.requireActual("../services/reviewAPI");
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
  try {
    const query = method === "GET" ? { scope: "received" } : { reviewId: "review-1" };
    await web.requestReview(method, query);
    const path = method === "GET" ? "/reviews?scope=received" : "/reviews/review-1";
    expect(global.fetch.mock.calls[0]).toEqual([`${web.API_REVIEW_BASE}${path}`,
      { method, headers: { Authorization: "access-token" } }]);
  } finally { global.fetch = originalFetch; }
});

it("requires a title before submission", async () => {
  render(<ReviewPage />);
  const text = await screen.findByLabelText("Written review (required)");
  fireEvent.click(screen.getAllByRole("radio")[4]);
  fireEvent.change(text, { target: { value: "Great stay." } });
  fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
  expect(screen.getByRole("alert").textContent).toContain("review title");
  expect(createReview).not.toHaveBeenCalled();
});

it("keeps legacy reservationId links compatible", async () => {
  mockSearch = `?reservationId=${booking.id}`;
  await submitReview();
  await screen.findByRole("heading", { name: "Review submitted" });
  expect(createReview).toHaveBeenCalledWith(expect.objectContaining({ bookingId: booking.id }));
});

it("gives bookingId precedence over the legacy parameter", async () => {
  mockSearch = `?bookingId=${booking.id}&reservationId=wrong`;
  await submitReview();
  await screen.findByRole("heading", { name: "Review submitted" });
  expect(createReview).toHaveBeenCalledWith(expect.objectContaining({ bookingId: booking.id }));
});

it("does not interpret a payment ID as the review booking ID", async () => {
  getGuestBookings.mockResolvedValue([{ ...booking, id: undefined, paymentid: booking.id }]);
  render(<ReviewPage />);
  await screen.findByRole("heading", { name: "Review unavailable" });
  expect(createReview).not.toHaveBeenCalled();
});

it("never serializes client-supplied identity or status fields", async () => {
  const api = jest.requireActual("../services/reviewAPI");
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => "{}" });
  try {
    await api.createReview({ bookingId: booking.id, rating: 4, title: "Stay", publicReview: "Good", privateFeedback: "Host only",
      reviewer_user_id: "spoof", reviewee_user_id: "spoof", property_id: "spoof", host_id: "spoof",
      status: "PUBLISHED", publication_status: "PUBLISHED", verification_status: "VERIFIED_STAY", review_type: "spoof" });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      booking_id: booking.id, overall_rating: 4, title: "Stay", public_review: "Good", private_feedback: "Host only",
    });
  } finally { global.fetch = originalFetch; }
});
