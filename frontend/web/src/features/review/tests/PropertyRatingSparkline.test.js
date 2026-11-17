import React from "react";
import { render, screen } from "@testing-library/react";
import PropertyRatingSparkline from "../components/PropertyRatingSparkline";
import { getPropertyReviewPerformance } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ getPropertyReviewPerformance: jest.fn() }));

test("renders supplied history with gaps and half-star ratings without fetching", () => {
  const history = [null, 4.5, 3.5, null, 4, 2.5].map((score) => ({
    average_rating: score, review_count: score === null ? 0 : 2,
  }));
  const { container } = render(<PropertyRatingSparkline history={history} declining />);
  expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Last six periods: no reviews, 4.50, 3.50, no reviews, 4.00, 2.50");
  expect(container.querySelectorAll("circle")).toHaveLength(4);
  expect(container.querySelectorAll('path[stroke]')).toHaveLength(2);
  expect(getPropertyReviewPerformance).not.toHaveBeenCalled();
});

test.each([undefined, null, [], Array(6).fill({ review_count: 1, average_rating: "bad" })])(
  "shows unavailable history safely for %j", (history) => {
    render(<PropertyRatingSparkline history={history} />);
    expect(screen.getByText("History unavailable")).toBeInTheDocument();
    expect(getPropertyReviewPerformance).not.toHaveBeenCalled();
  },
);
