import React from "react";
import { render, screen } from "@testing-library/react";
import ReviewsSection from "../../bookingengine/listingdetails/components/ReviewsSection";

const review = { id: "r1", rating: 4, text: "Enjoyed the stay", date: 1000, categories: [] };
test("shows the badge for a backend-confirmed verified stay", () => {
  render(<ReviewsSection reviews={[{ ...review, verified: true }]} />);
  expect(screen.getByText("Verified Stay")).toBeInTheDocument();
});
test.each([false, undefined, null])("does not show a badge for verification value %j", (verified) => {
  render(<ReviewsSection reviews={[{ ...review, verified }]} />);
  expect(screen.queryByText("Verified Stay")).not.toBeInTheDocument();
});
