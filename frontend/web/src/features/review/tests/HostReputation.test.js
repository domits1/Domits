import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Auth } from "aws-amplify";
import HostReviews from "../views/HostReviews";
import HostReputation from "../components/HostReputation";
import { getHostReviewDashboard, requestReview } from "../services/reviewAPI";
jest.mock("aws-amplify", () => ({ Auth: { currentUserInfo: jest.fn() } }));
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../../services/hostPropertyService", () => ({ fetchHostPropertySelectOptions: async () => [] }));
jest.mock("../views/ReviewPerformance", () => () => <p>Property performance</p>);
jest.mock("../views/DecliningPropertyRatings", () => () => null);
jest.mock("../../../services/getAccessToken", () => ({ getIdToken: async () => "token" }));
jest.mock("../services/reviewAPI", () => ({ getHostReviewDashboard: jest.fn(),
  requestReview: jest.fn() }));
const data = {
  host_id: "host", overall_score: 4.8, review_count: 11,
  category_ratings: { communication: 4.9, responsiveness: 4.8, hospitality: 4.7 },
  next_offset: 10, reviews: [{ id: "r1", overall_rating: 5, title: "Excellent host!",
    public_review: "Welcoming and responsive.", created_at: 1783382400000,
    private_feedback: "private guest notes", reviewer_user_id: "private-user" }],
};
beforeEach(() => {
  jest.clearAllMocks();
  Auth.currentUserInfo.mockResolvedValue({ attributes: { sub: "host" } });
  getHostReviewDashboard.mockResolvedValue(data);
  requestReview.mockResolvedValue({ ok: true, json: async () => [] });
});

it("opens Host Reviews by default with the design's table columns and unavailable actions", async () => {
  render(<HostReviews />);
  await screen.findByText("Excellent host!");
  expect(screen.getByRole("button", { name: "Host Reviews" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("Stay period")).toBeInTheDocument();
  expect(screen.getByText("Actions")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reply" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
});

it("shows host aggregates and verified feedback, with unavailable replies disabled", async () => {
  render(<HostReputation userId="host" />);
  expect(await screen.findByText("(11 host reviews)")).toBeInTheDocument();
  expect(within(screen.getByRole("region", { name: "Host Rating" })).getByText("4.8")).toBeInTheDocument();
  for (const [name, value] of [["Communication", "4.9"], ["Responsiveness", "4.8"], ["Hospitality", "4.7"]]) {
    expect(within(screen.getByRole("region", { name })).getByText(value)).toBeInTheDocument();
  }
  const review = screen.getByRole("article", { name: "Excellent host!" });
  expect(review).toHaveTextContent("Welcoming and responsive.");
  expect(within(review).getByText("Verified stay")).toBeInTheDocument();
  expect(screen.queryByText("private guest notes")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reply" })).toBeDisabled();
  expect(getHostReviewDashboard).toHaveBeenCalledWith("host", 0);
});
it("shows loading without stale reputation", () => {
  getHostReviewDashboard.mockReturnValue(new Promise(() => {}));
  render(<HostReputation userId="host" />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading host reviews");
  expect(screen.queryByText("4.8")).not.toBeInTheDocument();
});
it("renders an empty state without inventing zero-star scores", async () => {
  getHostReviewDashboard.mockResolvedValue({ ...data, overall_score: null, review_count: 0, reviews: [], next_offset: null,
    category_ratings: { communication: null, responsiveness: null, hospitality: null } });
  render(<HostReputation userId="host" />);
  expect(await screen.findByText(/No host reviews yet/)).toBeInTheDocument();
  expect(screen.getAllByText("No ratings yet")).toHaveLength(4);
  expect(screen.queryByRole("navigation", { name: "Host review pages" })).not.toBeInTheDocument();
});
it("handles API errors and retries", async () => {
  getHostReviewDashboard.mockRejectedValueOnce(new Error("Service unavailable"));
  render(<HostReputation userId="host" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Retry host reviews" }));
  await screen.findByText("(11 host reviews)");
  expect(getHostReviewDashboard).toHaveBeenCalledTimes(2);
});
it("paginates on the server without recalculating aggregate scores from the current page", async () => {
  getHostReviewDashboard.mockResolvedValueOnce(data).mockResolvedValue({ ...data, reviews: [], next_offset: null });
  render(<HostReputation userId="host" />);
  fireEvent.click(await screen.findByRole("button", { name: "Next" }));
  await screen.findByRole("button", { name: "Page 2", current: "page" });
  expect(getHostReviewDashboard).toHaveBeenLastCalledWith("host", 10);
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  expect(screen.getByText("No host reviews on this page.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  await screen.findByRole("button", { name: "Page 1", current: "page" });
  expect(getHostReviewDashboard).toHaveBeenLastCalledWith("host", 0);
});
it("ignores late responses after the host changes", async () => {
  let resolve;
  getHostReviewDashboard.mockReturnValueOnce(new Promise(done => { resolve = done; }))
    .mockResolvedValue({ ...data, reviews: [], review_count: 2 });
  const { rerender } = render(<HostReputation userId="old-host" />);
  rerender(<HostReputation userId="host" />);
  expect(within(await screen.findByRole("region", { name: "Host Rating" })).getByText("(2 host reviews)")).toBeInTheDocument();
  await act(async () => { resolve(data); });
  expect(screen.queryByText("(11 host reviews)")).not.toBeInTheDocument();
});
it("keeps host reputation separate from property reviews and performance", async () => {
  render(<HostReviews initialView="reviews" />);
  await screen.findByText("Received reviews (0)");
  fireEvent.click(screen.getByRole("button", { name: "Host Reviews" }));
  await screen.findByText("Excellent host!");
  expect(screen.queryByText("Received reviews (0)")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Property Reviews" }));
  fireEvent.click(screen.getByRole("button", { name: "Review performance over time" }));
  expect(screen.getByText("Property performance")).toBeInTheDocument();
  expect(screen.queryByText("Excellent host!")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Property Reviews" }));
  await screen.findByText("Received reviews (0)");
});
it("does not fetch host reputation before authentication", async () => {
  Auth.currentUserInfo.mockResolvedValue(null);
  render(<HostReviews initialView="reviews" />);
  fireEvent.click(screen.getByRole("button", { name: "Host Reviews" }));
  await act(async () => {});
  expect(mockNavigate).toHaveBeenCalledWith("/login");
  expect(getHostReviewDashboard).not.toHaveBeenCalled();
});
it("excludes host reviews from the generic property list and its average", async () => {
  requestReview.mockImplementation(async (_method, { scope }) => ({ ok: true, json: async () => scope === "received" ? [
    { id: "property", review_type: "GUEST_TO_PROPERTY", title: "Property feedback", overall_rating: 2, public_review: "Accommodation", created_at: 1000 },
    { ...data.reviews[0], review_type: "GUEST_TO_HOST" },
  ] : [] }));
  render(<HostReviews initialView="reviews" />);
  await screen.findByText("Received reviews (1)");
  expect(screen.getByRole("button", { name: "Property feedback" })).toBeInTheDocument();
  expect(screen.queryByText("Excellent host!")).not.toBeInTheDocument();
  expect(screen.getAllByText("2.0").length).toBeGreaterThan(0);
  expect(getHostReviewDashboard).not.toHaveBeenCalled();
});

describe("host dashboard API contract", () => {
  let originalFetch;
  const api = jest.requireActual("../services/reviewAPI");
  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(() => { global.fetch = originalFetch; });
  it("uses the authenticated dashboard scope without a client ownership override", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(data) });
    await expect(api.getHostReviewDashboard("host", 0)).resolves.toMatchObject({ overall_score: 4.8 });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("scope=host-dashboard");
    expect(url).not.toContain("hostId");
    expect(options.headers.Authorization).toBe("token");
  });
  it.each([{ host_id: "other" }, { reviews: null }, { overall_score: 9 }, { category_ratings: {} }, { next_offset: 3 }])(
    "rejects mismatched ownership or malformed response: %o", async changes => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ ...data, ...changes }) });
      await expect(api.getHostReviewDashboard("host")).rejects.toThrow("unexpected response");
    });
  it("rejects unauthorized API responses", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, text: async () => '{"message":"Access denied"}' });
    await expect(api.getHostReviewDashboard("host")).rejects.toMatchObject({ status: 403 });
  });
});
