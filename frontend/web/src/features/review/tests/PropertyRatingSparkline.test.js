import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import PropertyRatingSparkline from "../components/PropertyRatingSparkline";
import { getPropertyReviewPerformance } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ getPropertyReviewPerformance: jest.fn() }));
test("loads six exact adjacent windows and preserves empty periods", async () => {
  getPropertyReviewPerformance.mockResolvedValue({ periods: [{ review_count: 2, average_score: 4.5 }] })
    .mockResolvedValueOnce({ periods: [{ review_count: 0, average_score: null }] });
  render(<PropertyRatingSparkline propertyId="p1" endDate="2026-10-25" days={30} declining />);
  await screen.findByRole("img");
  expect(getPropertyReviewPerformance).toHaveBeenCalledTimes(6);
  expect(getPropertyReviewPerformance.mock.calls[5][0]).toEqual({ propertyId: "p1", interval: "month", startDate: "2026-09-26", endDate: "2026-10-25" });
  expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("no reviews, 4.50"));
});
