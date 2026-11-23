import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ReviewFlagDialog from "../components/ReviewFlagDialog";
import ReviewModerationQueue from "../components/ReviewModerationQueue";
import ReviewApprovalDetails from "../components/ReviewApprovalDetails";
import ReviewApprovalTable from "../components/ReviewApprovalTable";
import { flagReview, resolveReviewFlag, getReviewFlags, approveReview } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ flagReview: jest.fn(), resolveReviewFlag: jest.fn(), getReviewFlags: jest.fn(), approveReview: jest.fn() }));
const review = { id: "r1", title: "Stay", public_review: "Clean", status: "PENDING_APPROVAL", updated_at: 123, overall_rating: 4 };
beforeEach(() => {
  jest.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
test("duplicate pending flag errors preserve the dialog and allow another attempt", async () => {
  flagReview.mockRejectedValueOnce(Object.assign(new Error("This review already has a pending flag."), { status: 409 }))
    .mockRejectedValueOnce(new Error("Still flagged"));
  const onFlagged = jest.fn();
  render(<ReviewFlagDialog review={review} onFlagged={onFlagged} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "SPAM" } });
  fireEvent.click(screen.getByRole("button", { name: "Flag review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("already has a pending flag");
  expect(screen.getByRole("button", { name: "Flag review" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Flag review" }));
  await screen.findByText("Still flagged");
  expect(flagReview).toHaveBeenCalledTimes(2);
  expect(onFlagged).not.toHaveBeenCalled();
});
test("flagged pending reviews show a label without either approval action", () => {
  const item = { ...review, has_pending_flag: true };
  render(<><ReviewApprovalDetails review={item} /><ReviewApprovalTable reviews={[item]} approvingIds={new Set()} /></>);
  expect(screen.getAllByText("Flagged")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /^Approve/ })).toBeNull();
});
test("failed resolution leaves the row available; retry opens the resolved review for approval", async () => {
  const flag = { id: "f1", review_id: "r1", title: "Stay", public_review: "Clean", reason: "SPAM", review: { ...review, has_pending_flag: false } };
  getReviewFlags.mockResolvedValue({ flags: [flag], next_offset: null });
  resolveReviewFlag.mockRejectedValueOnce(new Error("Resolution failed")).mockResolvedValueOnce(flag);
  approveReview.mockResolvedValue({ status: "APPROVED" });
  render(<ReviewModerationQueue />);
  fireEvent.click(await screen.findByRole("button", { name: "Mark resolved" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Resolution failed");
  expect(screen.getByRole("button", { name: "Mark resolved" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Mark resolved" }));
  fireEvent.click(await screen.findByRole("button", { name: "View resolved review" }));
  fireEvent.click(await screen.findByRole("button", { name: "Approve review" }));
  await screen.findByText(/is approved and awaiting publication/);
  expect(approveReview).toHaveBeenCalledWith("r1", 123);
  expect(resolveReviewFlag).toHaveBeenCalledTimes(2);
});
