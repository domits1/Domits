import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ReceivedReviews from "../components/ReceivedReviews";
import { deleteHostResponse } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ deleteHostResponse: jest.fn(), requestReview: jest.fn().mockRejectedValue(new Error("Unavailable")) }));
jest.mock("../../../services/hostPropertyService", () => ({
  fetchHostPropertySelectOptions: async () => [{ value: "p1", title: "City studio", location: "Amsterdam" }],
}));
const reviews = [
  { id: "a", guest_name: "Sarah Lee", property_id: "p1", title: "Wonderful stay", rating: 5, content: "Very clean", date: 1784505600000, verification_status: "VERIFIED_STAY" },
  { id: "b", title: "Quiet room", rating: 3, content: "Comfortable bed", date: 1784419200000 },
];
test("searches property metadata, sorts ratings, and keeps the overall summary based on all received reviews", async () => {
  render(<ReceivedReviews userId="host" reviews={reviews} loading={false} error="" onRetry={() => {}} />);
  await screen.findByText("City studio · Amsterdam");
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

test.each(["VERIFIED", "UNVERIFIED", undefined])("does not claim verified stay for %s", async (verification_status) => {
  render(<ReceivedReviews userId="host" reviews={[{ ...reviews[0], verification_status }]} loading={false} error="" onRetry={() => {}} />);
  await screen.findByText("City studio · Amsterdam");
  expect(screen.queryByText("Verified stay")).not.toBeInTheDocument();
});

test("selects a review and searches guest names", async () => {
  render(<ReceivedReviews userId="host" reviews={reviews} loading={false} error="" onRetry={() => {}} />);
  expect(screen.queryByRole("region", { name: "Selected review" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Wonderful stay", exact: true }));
  const detail = screen.getByRole("region", { name: "Selected review" });
  expect(within(detail).getByText("Very clean")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Quiet room", exact: true }));
  expect(within(detail).getByText("Comfortable bed")).toBeInTheDocument();
  expect(within(detail).queryByText("Very clean")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Sarah Lee" } });
  expect(screen.queryByRole("region", { name: "Selected review" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Wonderful stay", exact: true }));
  expect(within(screen.getByRole("region", { name: "Selected review" })).getByText("Very clean")).toBeInTheDocument();
});

test("deleted response stays cleared when switching reviews", async () => {
  deleteHostResponse.mockResolvedValueOnce(undefined);
  function ResponseWorkspace() {
    const [respondableReviews, setRespondableReviews] = React.useState({
      a: { ...reviews[0], response: { status: "published", message: "Old reply" } }, b: reviews[1],
    });
    return <ReceivedReviews userId="host" reviews={reviews} loading={false} error=""
      respondableReviews={respondableReviews} onResponseChange={(id, response) =>
        setRespondableReviews(current => ({ ...current, [id]: { ...current[id], response } }))} />;
  }
  render(<ResponseWorkspace />);
  await screen.findByText(/City studio.*Amsterdam/);
  fireEvent.click(screen.getByRole("button", { name: "Wonderful stay", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Response" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(await screen.findByRole("textbox")).toHaveValue("");
  fireEvent.click(screen.getByRole("button", { name: "Quiet room", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Wonderful stay", exact: true }));
  expect(screen.queryByLabelText("Host response")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete Response" })).toBeDisabled();
  expect(screen.getByRole("textbox")).toHaveValue("");
});
