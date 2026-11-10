import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HostReviews from "../views/HostReviews";

jest.mock("../../../services/hostPropertyService", () => ({
  fetchHostPropertySelectOptions: async () => [],
}));

jest.mock("aws-amplify", () => ({
  Auth: { currentUserInfo: async () => ({ attributes: { sub: "host" } }) },
}));
jest.mock("../services/reviewAPI", () => ({
  requestReview: async () => ({ ok: true, json: async () => [] }),
}));
jest.mock("../views/ReviewPerformance", () => ({ __esModule: true,
  default: () => <h3>Performance panel</h3>,
}));
jest.mock("../views/DecliningPropertyRatings", () => ({ __esModule: true,
  default: () => <h3>Trends panel</h3>,
}));

test("switches between the three review views and shows only the selected content", async () => {
  render(<MemoryRouter><HostReviews /></MemoryRouter>);
  await screen.findByText("Received reviews (0)");
  expect(screen.queryByRole("button", { name: "My reviews" })).not.toBeInTheDocument();
  const review = screen.getByRole("button", { name: "Review", exact: true });
  expect(review).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByText("Performance panel")).not.toBeInTheDocument();
  expect(screen.queryByText("Trends panel")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Review performance over time" }));
  expect(await screen.findByText("Performance panel")).toBeInTheDocument();
  expect(screen.queryByText("Received reviews (0)")).not.toBeInTheDocument();
  expect(review).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(screen.getByRole("button", { name: "Properties with declining ratings" }));
  expect(await screen.findByText("Trends panel")).toBeInTheDocument();
  expect(screen.queryByText("Performance panel")).not.toBeInTheDocument();

  fireEvent.click(review);
  expect(await screen.findByText("Received reviews (0)")).toBeInTheDocument();
  expect(screen.queryByText("Trends panel")).not.toBeInTheDocument();
});
