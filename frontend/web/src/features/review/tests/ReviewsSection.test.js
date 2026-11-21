import React from "react";
import { render, screen } from "@testing-library/react";
import ReviewsSection from "../components/ReviewsSection";

test.each([[4.2, 4, 0], [4.7, 5, 1]])("renders %s without filling an extra full star", (rating, filled, halves) => {
  render(<ReviewsSection reviews={[{ id: "r1", name: "Guest", rating, text: "Stay" }]} />);
  const stars = screen.getByLabelText(`${rating} stars`);
  expect(stars.querySelectorAll(".reviews-section__star--filled")).toHaveLength(filled);
  expect(stars.querySelectorAll('[data-testid="StarHalfIcon"]')).toHaveLength(halves);
  expect(stars.querySelectorAll(".reviews-section__star--empty")).toHaveLength(5 - filled);
});
