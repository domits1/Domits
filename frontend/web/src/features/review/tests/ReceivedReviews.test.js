import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ReceivedReviews from "../components/ReceivedReviews";
import { deleteHostResponse } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ deleteHostResponse: jest.fn(), requestReview: jest.fn().mockRejectedValue(new Error("Unavailable")) }));
jest.mock("../../../services/hostPropertyService", () => ({
  fetchHostPropertySelectOptions: async () => [{ value: "p1", title: "City studio", location: "Amsterdam" }],
}));
const reviews = [
  { id: "a", guest_name: "Sarah Lee", property_id: "p1", title: "Wonderful stay", rating: 5, content: "Very clean", date: 1784505600000, verification_status: "VERIFIED" },
  { id: "b", title: "Quiet room", rating: 3, content: "Comfortable bed", date: 1784419200000 },
];
test("searches property metadata, sorts ratings, and keeps the overall summary based on all received reviews", async () => {
  render(<ReceivedReviews userId="host" reviews={reviews} loading={false} error="" onRetry={() => {}} />);
  await screen.findByText(/City studio.*Amsterdam/);
  expect(screen.getAllByText("Sarah Lee")[0]).toBeInTheDocument();
  expect(screen.getAllByText("SL")[0]).toBeInTheDocument();
  const list = screen.getByRole("region", { name: "Received reviews (2)" });
  expect(screen.getByText("4.0")).toBeInTheDocument();
  expect(screen.getByText("Verified stay")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Newest first", { selector: "summary" }));
  fireEvent.click(screen.getByRole("button", { name: "Lowest rating" }));
  expect(within(list).getAllByRole("article")[0]).toHaveTextContent("Quiet room");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Amsterdam" } });
  expect(within(list).getAllByRole("article")).toHaveLength(1);
  expect(screen.getByText("4.0")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing property" } });
  expect(screen.getByText("No matching reviews")).toBeInTheDocument();
});

test("selects reviews in the response panel and cancels unsaved edits", async () => {
  render(<ReceivedReviews userId="host" reviews={reviews} loading={false} error=""
    respondableReviews={{ a: { ...reviews[0], response: { status: "draft", message: "Saved", updatedAt: 1000 } }, b: reviews[1] }} />);
  await screen.findByText(/City studio.*Amsterdam/);
  expect(screen.queryByRole("region", { name: "Selected review" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Wonderful stay", exact: true }));
  const panel = screen.getByRole("region", { name: "Selected review" });
  expect(within(panel).getByLabelText("Your response")).toHaveValue("Saved");
  expect(within(panel).getByText(/Last edited:/)).toBeInTheDocument();
  fireEvent.change(within(panel).getByLabelText("Your response"), { target: { value: "Unsaved" } });
  fireEvent.click(within(panel).getByRole("button", { name: "Cancel" }));
  expect(within(panel).getByLabelText("Your response")).toHaveValue("Saved");
  fireEvent.click(screen.getByRole("button", { name: "Quiet room", exact: true }));
  expect(within(panel).getByRole("heading", { name: "Quiet room" })).toBeInTheDocument();
  expect(within(panel).getByLabelText("Your response")).toHaveValue("");
});

test("deleted response stays cleared when switching reviews", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  deleteHostResponse.mockResolvedValueOnce(undefined);
  try {
    render(<ReceivedReviews userId="host" reviews={reviews} loading={false} error=""
      respondableReviews={{ a: { ...reviews[0], response: { status: "published", message: "Old reply" } }, b: reviews[1] }} />);
    await screen.findByText(/City studio.*Amsterdam/);
    fireEvent.click(screen.getByRole("button", { name: "Wonderful stay", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Response" }));
    await screen.findByText("Response deleted.");
    fireEvent.click(screen.getByRole("button", { name: "Quiet room", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Wonderful stay", exact: true }));
    expect(screen.queryByLabelText("Host response")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Response" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your response")).toHaveValue("");
  } finally { confirm.mockRestore(); }
});
