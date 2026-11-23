import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import GuestReviews from "../views/GuestReviews";
import { requestReview } from "../services/reviewAPI";
jest.mock("aws-amplify", () => ({ Auth: { currentUserInfo: jest.fn() } }));
jest.mock("../services/reviewAPI", () => ({ requestReview: jest.fn() }));
const id = "12345678-1234-1234-1234-123456789abc";
const detail = { id, title: "My rejected review", public_review: "My public feedback", status: "REJECTED", overall_rating: 4,
  private_feedback: "SECRET", moderation_notes: "INTERNAL", response: { message: "Published host reply", published_at: 1794744000000 } };
const ok = body => ({ ok: true, json: async () => body });
const mount = () => render(<MemoryRouter initialEntries={[`/guestdashboard/reviews?reviewId=${id}`]}><GuestReviews /></MemoryRouter>);
beforeEach(() => {
  Auth.currentUserInfo.mockResolvedValue({ attributes: { sub: "guest-sub" } });
  requestReview.mockImplementation(async (_method, query) => ok(query.view === "history" ? detail : []));
});
afterEach(() => jest.clearAllMocks());

test("notification links load and focus the authenticated guest's history entry, including rejected reviews", async () => {
  mount(); expect(await screen.findByText("My rejected review")).toBeInTheDocument();
  expect(screen.getByText("Published host reply")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("article")).toHaveFocus());
  expect(requestReview).toHaveBeenCalledWith("GET", { reviewId: id, view: "history" });
  expect(document.body.textContent).not.toMatch(/SECRET|INTERNAL/);
  expect(screen.queryByRole("button", { name: "Delete review" })).not.toBeInTheDocument();
});

test("an inaccessible target never displays another guest's content", async () => {
  requestReview.mockImplementation(async (_method, query) => query.view === "history" ? { ok: false, status: 403 } : ok([]));
  mount(); expect(await screen.findByRole("alert")).toHaveTextContent("unavailable for your account");
  expect(screen.queryByText("My rejected review")).not.toBeInTheDocument();
});

test("mismatched detail IDs are rejected and unpublished host responses remain hidden", async () => {
  requestReview.mockImplementation(async (_method, query) => query.view === "history" ? ok({ ...detail, id: "other", response: { message: "DRAFT HOST RESPONSE" } }) : ok([]));
  mount(); await screen.findByRole("alert");
  expect(screen.queryByText("My rejected review")).not.toBeInTheDocument();
  expect(screen.queryByText("DRAFT HOST RESPONSE")).not.toBeInTheDocument();
});


test("unpublished response content is hidden on an otherwise accessible entry", async () => {
  requestReview.mockImplementation(async (_method, query) => query.view === "history" ? ok({ ...detail, response: { message: "DRAFT HOST RESPONSE", published_at: null } }) : ok([]));
  mount(); await screen.findByText("My rejected review");
  expect(screen.queryByText("DRAFT HOST RESPONSE")).not.toBeInTheDocument();
});


test("changing accounts clears the previous guest's linked review", async () => {
  mount(); await screen.findByText("My rejected review");
  Auth.currentUserInfo.mockResolvedValue({ attributes: { sub: "new-guest" } });
  requestReview.mockImplementation(async (_method, query) => query.view === "history" ? { ok: false, status: 403 } : ok([]));
  fireEvent(window, new Event("authChanged"));
  await screen.findByRole("alert");
  expect(screen.queryByText("My rejected review")).not.toBeInTheDocument();
  expect(screen.queryByText("Published host reply")).not.toBeInTheDocument();
});

test("refreshing the same account reloads its linked review without getting stuck loading", async () => {
  mount(); await screen.findByText("My rejected review");
  requestReview.mockImplementation(async (_method, query) => ok(query.view === "history" ? { ...detail, title: "Refreshed own review" } : []));
  fireEvent(window, new Event("authChanged"));
  expect(await screen.findByText("Refreshed own review")).toBeInTheDocument();
});

test("loads typed reservation detail and removes its linked card after deletion", async () => {
  const type = "GUEST_TO_RESERVATION";
  const reservation = { ...detail, review_type: type, status: "PUBLISHED", title: "Reservation Review", booking_id: "b1" };
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  requestReview.mockImplementation(async (_method, query) => ok(query.view === "history" ? reservation : []));
  try {
    render(<MemoryRouter initialEntries={[`/guestdashboard/reviews?reviewId=${id}&review_type=${type}`]}><GuestReviews /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Booking #b1" })).toBeInTheDocument();
    expect(requestReview).toHaveBeenCalledWith("GET", { reviewId: id, view: "history", review_type: type });
    fireEvent.click(screen.getByRole("button", { name: "Delete review" }));
    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
    expect(requestReview).toHaveBeenCalledWith("DELETE", { reviewId: id });
  } finally { confirm.mockRestore(); }
});
