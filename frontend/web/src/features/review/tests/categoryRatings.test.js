import React from "react";
import { render, screen, within } from "@testing-library/react";
import CommonReviewTopics from "../components/CommonReviewTopics";
import { requestReview } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ requestReview: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test("fetches category ratings and combines counts across unique properties", async () => {
  requestReview.mockImplementation(async (_, { propertyId }) => ({ ok: true, json: async () => ({
    categories: [{ category_key: "clean", label: "Cleanliness", rating_count: propertyId === "p1" ? 3 : 2,
      average_rating: propertyId === "p1" ? 5 : 4, sort_order: 1 }],
  }) }));
  render(<CommonReviewTopics userId="host" propertyIds={["p1", "p2", "p1"]} />);
  const label = await screen.findByText("Cleanliness");
  expect(within(label.closest("li")).getByText("4.60 / 5")).toBeInTheDocument();
  expect(requestReview).toHaveBeenCalledTimes(2);
  expect(requestReview).toHaveBeenCalledWith("GET", { scope: "property-categories", propertyId: "p1" });
});
test("does not display partial counts on request failure", async () => {
  requestReview.mockResolvedValue({ ok: false });
  render(<CommonReviewTopics userId="host" propertyIds={["p1"]} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load category ratings");
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
test("shows database categories even when they have no ratings yet", async () => {
  requestReview.mockResolvedValue({ ok: true, json: async () => ({ categories: [
    { category_key: "clean", label: "Cleanliness", rating_count: 0, average_rating: null },
  ] }) });
  render(<CommonReviewTopics userId="host" propertyIds={["p1"]} />);
  const label = await screen.findByText("Cleanliness");
  expect(within(label.closest("li")).getByText("No ratings yet")).toBeInTheDocument();
});
test("preserves database order and displays the supplied two-review averages", async () => {
  const categories = [["Accuracy", 4.75], ["Amenities", 4.25], ["Check-in", 4.75], ["Cleanliness", 4.75],
    ["Comfort", 4.25], ["Communication", 4.75], ["Hospitality", 4.50], ["Location", 4.00], ["Value", 3.75]];
  requestReview.mockResolvedValue({ ok: true, json: async () => ({ categories: categories.map(([label, average_rating], sort_order) => ({
    category_key: label, label, average_rating, rating_count: 2, sort_order,
  })).reverse() }) });
  render(<CommonReviewTopics userId="host" propertyIds={["p1"]} />);
  await screen.findByText("Accuracy");
  const items = screen.getAllByRole("listitem");
  categories.forEach(([label, average], index) => {
    expect(items[index]).toHaveTextContent(label);
    expect(items[index]).toHaveTextContent(`${average.toFixed(2)} / 5`);
  });
});
