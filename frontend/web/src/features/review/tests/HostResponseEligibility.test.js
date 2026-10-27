import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import HostReviews from "../views/HostReviews";
import { Auth } from "aws-amplify";
import { requestReview } from "../services/reviewAPI";

jest.mock("../components/categoryRatings", () => () => null);
jest.mock("../../../services/hostPropertyService", () => ({ fetchHostPropertySelectOptions: async () => [] }));
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("aws-amplify", () => ({ Auth: { currentUserInfo: jest.fn() } }));
jest.mock("../../hostdashboard/pages", () => () => null);
jest.mock("../views/ReviewPerformance", () => () => null);
jest.mock("../views/DecliningPropertyRatings", () => () => null);
jest.mock("../services/reviewAPI", () => ({ requestReview: jest.fn() }));
jest.mock("../components/HostResponseForm", () => ({ review }) =>
  <button>Respond to {review.id}: {review.response?.message || "new response"}</button>);

const received = [
  { id: "eligible", title: "Verified property review" },
  { id: "unverified", title: "Unverified published review" },
  { id: "inactive", title: "Inactive listing review" },
  { id: "guest", title: "Review received as a guest" },
].map((review) => ({ ...review, content: review.title, date: 1000 }));
const eligible = [{ ...received[0], response: { message: "Existing reply" } }];
const response = (data) => ({ ok: true, json: async () => data });

beforeEach(() => {
  jest.clearAllMocks();
  Auth.currentUserInfo.mockResolvedValue({ attributes: { sub: "host-sub" } });
  requestReview.mockImplementation(async (method, { scope }) => {
    if (scope === "received") return response(received);
    if (scope === "respondable") return response(eligible);
    return response([]);
  });
});

test("keeps the complete received list and shows forms only for server-authorized IDs", async () => {
  render(<HostReviews />);
  for (const review of received) expect(await screen.findByRole("heading", { name: review.title })).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Respond to eligible: Existing reply" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Respond to/ })).toHaveLength(1);
  expect(screen.getByText("Received reviews (4)")).toBeInTheDocument();
  expect(requestReview).toHaveBeenCalledWith("GET", { scope: "received" });
  expect(requestReview).toHaveBeenCalledWith("GET", { scope: "respondable" });
});

test.each(["network", "malformed"])("keeps received reviews on %s eligibility failure and retries only eligibility", async (failure) => {
  let attempts = 0;
  requestReview.mockImplementation(async (method, { scope }) => {
    if (scope === "received") return response(received);
    if (scope === "respondable") {
      attempts += 1;
      if (attempts === 1) {
        if (failure === "network") throw new Error("offline");
        return response({ reviews: eligible });
      }
      return response(eligible);
    }
    return response([]);
  });
  render(<HostReviews />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not check which reviews");
  expect(await screen.findByRole("heading", { name: received[3].title })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Respond to/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry response eligibility" }));
  await screen.findByRole("button", { name: "Respond to eligible: Existing reply" });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(requestReview.mock.calls.filter(([, query]) => query.scope === "received")).toHaveLength(1);
});

test("shows received reviews without waiting for the eligibility request", async () => {
  let finish;
  requestReview.mockImplementation(async (method, { scope }) => {
    if (scope === "received") return response(received);
    if (scope === "respondable") return new Promise((resolve) => { finish = resolve; });
    return response([]);
  });
  render(<HostReviews />);
  await screen.findByRole("heading", { name: received[0].title });
  expect(screen.queryByRole("button", { name: /^Respond to/ })).not.toBeInTheDocument();
  await waitFor(() => expect(finish).toBeDefined());
  await act(async () => { finish(response(eligible)); });
  expect(screen.getByRole("button", { name: "Respond to eligible: Existing reply" })).toBeInTheDocument();
});
