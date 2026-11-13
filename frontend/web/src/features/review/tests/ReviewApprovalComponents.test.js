import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReviewApprovalDetails from "../components/ReviewApprovalDetails";
import ReviewApprovalTable from "../components/ReviewApprovalTable";
import ReviewApprovalNavigation from "../components/ReviewApprovalNavigation";
import { getReviewStatusLabel, isVerifiedStatus } from "../utils/reviewApprovalFormat";
import { REVIEW_APPROVAL_ADMIN_PATH } from "../navigation/reviewApprovalRoute";

const review = { id: "r1", title: "A stay", public_review: "<script>unsafe()</script>",
  status: "APPROVED", publication_status: "UNPUBLISHED", verification_status: "VERIFIED_STAY",
  overall_rating: 4, booking_id: "b1", created_at: 1000 };
const callbacks = () => ({ onApprove: jest.fn(), onPublish: jest.fn(), onView: jest.fn(), onClose: jest.fn() });
const table = (item = review, actions = callbacks()) => <ReviewApprovalTable label="Reviews"
  reviews={[item]} selectedId="r1" approvingIds={new Set()} {...actions} />;

test("renders all components with real formatting and route dependencies", () => {
  render(<MemoryRouter initialEntries={[REVIEW_APPROVAL_ADMIN_PATH]}>
    <ReviewApprovalNavigation>
      {table()}
      <ReviewApprovalDetails review={review} {...callbacks()} />
    </ReviewApprovalNavigation>
  </MemoryRouter>);
  expect(screen.getByRole("link", { name: "Reviews" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("heading", { name: "Review details" })).toBeInTheDocument();
  expect(screen.getByText("Verified stay")).toBeInTheDocument();
  expect(screen.getAllByText(review.public_review)).toHaveLength(2);
  expect(document.querySelector("script")).toBeNull();
});

test.each([undefined, null, "", "bad", Infinity, 0, 6])("handles missing or invalid rating %s", (rating) => {
  const item = { ...review, overall_rating: rating };
  render(<>{table(item)}<ReviewApprovalDetails review={item} {...callbacks()} /></>);
  expect(screen.getAllByText("Rating unavailable")).toHaveLength(2);
  expect(screen.queryByText("NaN")).toBeNull();
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(document.querySelector("tr[aria-selected]")).toBeNull();
});

test("row keyboard activation ignores nested controls", () => {
  const actions = callbacks();
  render(table(review, actions));
  const checkbox = screen.getByRole("checkbox");
  fireEvent.keyDown(checkbox, { key: "Enter" });
  expect(actions.onView).not.toHaveBeenCalled();
  fireEvent.keyDown(checkbox.closest("tr"), { key: "Enter" });
  expect(actions.onView).toHaveBeenCalledWith("r1");
});

test.each([
  ["APPROVED", "UNPUBLISHED", true], ["APPROVED", "PUBLISHED", false],
  ["PENDING_APPROVAL", "UNPUBLISHED", false],
])("gates publishing for %s/%s", (status, publication_status, visible) => {
  render(table({ ...review, status, publication_status }));
  expect(Boolean(screen.queryByRole("button", { name: "Publish" }))).toBe(visible);
});

test("formatting exports handle known and unknown statuses", () => {
  expect(getReviewStatusLabel("APPROVED")).toBe("Approved");
  expect(getReviewStatusLabel("toString")).toBe("Unknown");
  expect(isVerifiedStatus("VERIFIED")).toBe(true);
  expect(isVerifiedStatus("VERIFIED_STAY")).toBe(true);
  expect(isVerifiedStatus("UNVERIFIED")).toBe(false);
});
