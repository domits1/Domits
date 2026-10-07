import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublicReviews from "../PublicReviews";
import { getPublicReviews } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ getPublicReviews: jest.fn() }));
const empty = { overall_score: null, review_count: 0, reviews: [], next_offset: null };
beforeEach(() => getPublicReviews.mockReset());
test("shows loading, empty, error and retry states", async () => {
  getPublicReviews.mockRejectedValueOnce(new Error("Could not load reviews"))
    .mockResolvedValueOnce(empty);
  render(<PublicReviews propertyId="p1" />);
  expect(screen.getByRole("status").textContent).toContain("Loading");
  expect((await screen.findByRole("alert")).textContent).toContain("Could not load reviews");
  fireEvent.click(screen.getByText("Retry"));
  await screen.findByText("No reviews match your selected filters.");
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
  await waitFor(() => expect(getPublicReviews).toHaveBeenLastCalledWith("p1", 10, expect.anything(), expect.any(Object)));
});
test("distinguishes a public host response and renders its text safely", async () => {
  getPublicReviews.mockResolvedValue({ ...empty, review_count: 1, reviews: [{ id: "r1", rating: 4,
    text: "Guest review", date: 1000, response: { message: "<b>Host reply</b>" } }] });
  render(<PublicReviews propertyId="p1" />);
  const response = await screen.findByLabelText("Host response");
  expect(response).toHaveTextContent("<b>Host reply</b>");
  expect(response.querySelector("b")).toBeNull();
});
test("combines filters, resets the page, keeps filters during pagination, and clears them", async () => {
  getPublicReviews.mockResolvedValue({ ...empty, review_count: 11, next_offset: 10 });
  render(<PublicReviews propertyId="p1" />);
  fireEvent.click(await screen.findByText("Next reviews"));
  await waitFor(() => expect(getPublicReviews).toHaveBeenLastCalledWith("p1", 10, expect.anything(), expect.any(Object)));
  fireEvent.change(screen.getByLabelText("Minimum rating"), { target: { value: "4" } });
  await waitFor(() => expect(getPublicReviews).toHaveBeenLastCalledWith("p1", 0, expect.anything(),
    expect.objectContaining({ minRating: "4" })));
  fireEvent.click(screen.getByLabelText("Verified stays only"));
  await waitFor(() => expect(getPublicReviews).toHaveBeenLastCalledWith("p1", 0, expect.anything(),
    expect.objectContaining({ minRating: "4", verified: "true" })));
  fireEvent.click(await screen.findByText("Next reviews"));
  await waitFor(() => expect(getPublicReviews).toHaveBeenLastCalledWith("p1", 10, expect.anything(),
    expect.objectContaining({ minRating: "4", verified: "true" })));
  fireEvent.click(screen.getByText("Clear filters"));
  await waitFor(() => expect(getPublicReviews).toHaveBeenLastCalledWith("p1", 0, expect.anything(),
    expect.objectContaining({ minRating: "", verified: "" })));
});
test("keeps filters visible when there are no matches", async () => {
  getPublicReviews.mockResolvedValue(empty);
  render(<PublicReviews propertyId="p1" />);
  await screen.findByText("No reviews match your selected filters.");
  expect(screen.getByLabelText("Minimum rating")).toBeInTheDocument();
  expect(screen.getByText("0 matching reviews")).toBeInTheDocument();
});
test("resets filters when switching properties and ignores the old request", async () => {
  let oldResult;
  getPublicReviews.mockImplementation((propertyId) => propertyId === "p1"
    ? new Promise((resolve) => { oldResult = resolve; }) : Promise.resolve(empty));
  const { rerender } = render(<PublicReviews propertyId="p1" />);
  fireEvent.change(screen.getByLabelText("Minimum rating"), { target: { value: "5" } });
  rerender(<PublicReviews propertyId="p2" />);
  await screen.findByText("0 matching reviews");
  oldResult({ ...empty, review_count: 99 });
  await waitFor(() => expect(getPublicReviews).toHaveBeenLastCalledWith("p2", 0, expect.anything(),
    expect.objectContaining({ minRating: "" })));
  expect(screen.queryByText("99 matching reviews")).not.toBeInTheDocument();
});
