import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublicReviews from "../components/PublicReviews";
import { getPublicReviews } from "../../../review/services/reviewAPI";
jest.mock("../../../review/services/reviewAPI", () => ({ getPublicReviews: jest.fn() }));
const empty = { overall_score: null, review_count: 0, reviews: [], next_offset: null };
beforeEach(() => getPublicReviews.mockReset());
test("shows loading, empty, error and retry states", async () => {
  getPublicReviews.mockRejectedValueOnce(new Error("Could not load reviews"))
    .mockResolvedValueOnce(empty);
  render(<PublicReviews propertyId="p1" />);
  expect(screen.getByRole("status").textContent).toContain("Loading");
  expect((await screen.findByRole("alert")).textContent).toContain("Could not load reviews");
  fireEvent.click(screen.getByText("Retry"));
  await screen.findByText("No reviews yet.");
});
test("shows all page cards, summary, categories, verified stay and pagination", async () => {
  getPublicReviews.mockResolvedValueOnce({ overall_score: 4.5, review_count: 11, next_offset: 10,
    reviews: [1, 2, 3].map((id) => ({ id, rating: 4, text: `Stay ${id}`, date: 1000,
      verified: true, categories: [{ key: "comfort", label: "Comfort", rating: 4.5 }] })) })
    .mockResolvedValueOnce({ ...empty, review_count: 11 });
  render(<PublicReviews propertyId="p1" />);
  await screen.findByText("Stay 3");
  expect(screen.getAllByText("Verified stay")).toHaveLength(3);
  expect(screen.getAllByText("Comfort: 4.5/5")).toHaveLength(3);
  expect(screen.getByText(/11 reviews/)).toBeTruthy();
  fireEvent.click(screen.getByText("Next reviews"));
  await waitFor(() => expect(getPublicReviews).toHaveBeenLastCalledWith("p1", 10, expect.anything()));
});
test("distinguishes a public host response and renders its text safely", async () => {
  getPublicReviews.mockResolvedValue({ ...empty, review_count: 1, reviews: [{ id: "r1", rating: 4,
    text: "Guest review", date: 1000, response: { message: "<b>Host reply</b>" } }] });
  render(<PublicReviews propertyId="p1" />);
  const response = await screen.findByLabelText("Host response");
  expect(response).toHaveTextContent("<b>Host reply</b>");
  expect(response.querySelector("b")).toBeNull();
});
