import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ReviewApprovalPage from "../views/ReviewApprovalPage";
import { approveReview, publishApprovedReview, flagReview, getAdminReviews, getReviewFlags, resolveReviewFlag } from "../services/reviewAPI";

jest.mock("../services/reviewAPI", () => ({
  approveReview: jest.fn(),
  publishApprovedReview: jest.fn(),
  getPendingApprovalReviews: jest.fn(),
  flagReview: jest.fn(),
  getReviewFlags: jest.fn(),
  resolveReviewFlag: jest.fn(),
  getAdminReviews: jest.fn(),
}));

const pendingReview = (overrides = {}) => ({
  id: "r1",
  booking_id: "DOM00123",
  property_id: "p1",
  review_type: "GUEST_TO_PROPERTY",
  overall_rating: 5,
  title: "Great stay!",
  public_review: "The apartment was clean, modern and well equipped.",
  verification_status: "VERIFIED",
  status: "PENDING_APPROVAL",
  publication_status: "UNPUBLISHED",
  created_at: new Date(2026, 6, 21, 10, 24).getTime(),
  updated_at: 1790000000000,
  property_title: "Riverside Apartment",
  property_city: "Amsterdam",
  property_country: "Netherlands",
  property_image_key: "images/p1/thumb",
  guest_name: "Jessica Smith",
  ...overrides,
});

const secondReview = pendingReview({
  id: "r2",
  booking_id: "DOM00122",
  overall_rating: 3,
  title: "Good location",
  public_review: "Nice location and easy check-in.",
  verification_status: "UNVERIFIED",
  updated_at: 1790000000001,
  property_title: "City Center Studio",
  guest_name: "Michael K.",
});

const table = () => screen.getByRole("table", { name: "Reviews pending approval" });
const rowFor = (title) => within(table()).getByText(title).closest("tr");
const details = () => screen.getByRole("complementary", { name: "Review details" });

describe("ReviewApprovalPage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getAdminReviews.mockResolvedValue([pendingReview(), secondReview]);
  });

  test("flags a review, resolves it from the moderation queue and views resolved flags", async () => {
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    const flag = { ...pendingReview(), id: "f1", reason: "SPAM" };
    const queue = (flags) => ({ flags, next_offset: null });
    flagReview.mockResolvedValue(flag);
    resolveReviewFlag.mockResolvedValue(flag);
    getReviewFlags.mockResolvedValueOnce(queue([flag])).mockResolvedValueOnce(queue([])).mockResolvedValueOnce(queue([flag]));
    render(<ReviewApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Flag for review" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "SPAM" } });
    fireEvent.click(dialog.getByRole("button", { name: "Flag review" }));
    expect(flagReview).toHaveBeenCalledWith("r1", "SPAM", "");
    fireEvent.click(await screen.findByRole("button", { name: "Mark resolved" }));
    expect(resolveReviewFlag).toHaveBeenCalledWith("f1");
    await screen.findByText("No pending review flags.");
    fireEvent.change(screen.getByLabelText("Flag status"), { target: { value: "RESOLVED" } });
    expect(await screen.findByText("Spam")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark resolved" })).toBeNull();
    expect(getReviewFlags).toHaveBeenLastCalledWith({ status: "RESOLVED", offset: 0, limit: 8 });
  });

  test("lists pending reviews with property, guest, booking, rating and status", async () => {
    render(<ReviewApprovalPage />);

    const row = await waitFor(() => rowFor("Great stay!"));
    expect(screen.getByRole("tab", { name: "Pending approval (2)" })).toHaveAttribute("aria-selected", "true");
    expect(within(row).getByText("Riverside Apartment")).toBeInTheDocument();
    expect(within(row).getByText("Amsterdam, Netherlands")).toBeInTheDocument();
    expect(within(row).getByText("Jessica Smith")).toBeInTheDocument();
    expect(within(row).getByText("JS")).toBeInTheDocument();
    expect(within(row).getByText("Booking #DOM00123")).toBeInTheDocument();
    expect(within(row).getByLabelText("5 out of 5 stars")).toBeInTheDocument();
    expect(within(row).getByText("21 Jul 2026")).toBeInTheDocument();
    expect(within(row).getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–2 of 2 reviews")).toBeInTheDocument();
  });

  test("shows approved reviews awaiting publication in the Unpublished tab", async () => {
    getAdminReviews.mockResolvedValue([
      pendingReview({ status: "APPROVED", publication_status: "UNPUBLISHED" }),
    ]);
    getAdminReviews.mockResolvedValueOnce([pendingReview(), secondReview]);
    render(<ReviewApprovalPage />);
    await screen.findByRole("tab", { name: "Pending approval (2)" });

    fireEvent.click(screen.getByRole("tab", { name: "Unpublished" }));

    const unpublishedTable = await screen.findByRole("table", { name: "Approved unpublished reviews" });
    expect(getAdminReviews).toHaveBeenCalledWith("approved");
    expect(within(unpublishedTable).getByText("Great stay!")).toBeInTheDocument();
    expect(within(unpublishedTable).getByText("Awaiting publication")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });

  test.each(["row", "details"])("publishes an approved review from the %s and removes it from Unpublished", async (source) => {
    getAdminReviews.mockResolvedValue([pendingReview({ status: "APPROVED", publication_status: "UNPUBLISHED" })]);
    let finishPublish;
    publishApprovedReview.mockImplementation(() => new Promise((resolve) => { finishPublish = resolve; }));
    getAdminReviews.mockResolvedValueOnce([pendingReview(), secondReview]);
    render(<ReviewApprovalPage />);
    await screen.findByRole("tab", { name: "Pending approval (2)" });
    fireEvent.click(screen.getByRole("tab", { name: "Unpublished" }));
    const unpublishedTable = await screen.findByRole("table", { name: "Approved unpublished reviews" });

    fireEvent.click(source === "row"
      ? within(unpublishedTable).getByRole("button", { name: "Publish" })
      : within(details()).getByRole("button", { name: "Publish review" }));

    expect(publishApprovedReview).toHaveBeenCalledWith("r1");
    expect(screen.getAllByRole("button", { name: "Publishing…" })).toHaveLength(2);
    screen.getAllByRole("button", { name: "Publishing…" }).forEach((button) => expect(button).toBeDisabled());
    finishPublish(pendingReview({ status: "PUBLISHED", publication_status: "PUBLISHED" }));
    expect(await screen.findByText("“Great stay!” is published.")).toBeInTheDocument();
    expect(screen.getByText("No approved reviews are awaiting publication.")).toBeInTheDocument();
    expect(approveReview).not.toHaveBeenCalled();
  });

  test("keeps an approved review available when publishing fails", async () => {
    getAdminReviews.mockResolvedValue([pendingReview({ status: "APPROVED", publication_status: "UNPUBLISHED" })]);
    publishApprovedReview.mockRejectedValue(new Error("Publication denied."));
    getAdminReviews.mockResolvedValueOnce([pendingReview(), secondReview]);
    render(<ReviewApprovalPage />);
    await screen.findByRole("tab", { name: "Pending approval (2)" });
    fireEvent.click(screen.getByRole("tab", { name: "Unpublished" }));
    const unpublishedTable = await screen.findByRole("table", { name: "Approved unpublished reviews" });
    fireEvent.click(within(unpublishedTable).getByRole("button", { name: "Publish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Publication denied.");
    expect(within(unpublishedTable).getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  test("loads status tabs and keeps historical reviews read-only", async () => {
    getAdminReviews.mockImplementation(async (scope) => scope === "admin-rejected" ? [] : [
      pendingReview({ title: "Published stay", status: "PUBLISHED", publication_status: "PUBLISHED" }),
    ]);
    getAdminReviews.mockResolvedValueOnce([pendingReview(), secondReview]);
    render(<ReviewApprovalPage />);
    await screen.findByRole("tab", { name: "Pending approval (2)" });

    const published = screen.getByRole("tab", { name: "Published" });
    fireEvent.click(published);
    const publishedTable = await screen.findByRole("table", { name: "Published reviews" });
    expect(within(publishedTable).getByText("Published stay")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(published).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(published, { key: "ArrowRight" });
    expect(await screen.findByText("No rejected reviews.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rejected" })).toHaveFocus();

    fireEvent.click(screen.getByRole("tab", { name: "All reviews" }));
    expect(await screen.findByRole("table", { name: "All reviews" })).toBeInTheDocument();
    expect(getAdminReviews.mock.calls).toEqual([["pending-approval"], ["admin-published"], ["admin-rejected"], ["admin-all"]]);
  });

  test("opens the first review in the details panel and switches on View", async () => {
    render(<ReviewApprovalPage />);

    expect(
      await within(await screen.findByRole("complementary", { name: "Review details" })).findByText(
        "The apartment was clean, modern and well equipped."
      )
    ).toBeInTheDocument();
    expect(within(details()).getByText("Verified")).toBeInTheDocument();
    expect(within(details()).getByText("Guest review")).toBeInTheDocument();
    expect(within(details()).queryByRole("button", { name: /delete/i })).toBeNull();

    fireEvent.click(within(rowFor("Good location")).getByRole("button", { name: "View" }));

    expect(within(details()).getByText("Nice location and easy check-in.")).toBeInTheDocument();
    expect(within(details()).getByText("Unverified")).toBeInTheDocument();
    expect(rowFor("Good location")).toHaveAttribute("aria-selected", "true");
  });

  test("opens review details by clicking row content or pressing Enter or Space on the row", async () => {
    render(<ReviewApprovalPage />);
    await screen.findByRole("complementary", { name: "Review details" });

    fireEvent.click(within(rowFor("Good location")).getByText("City Center Studio"));
    expect(within(details()).getByText("Nice location and easy check-in.")).toBeInTheDocument();

    fireEvent.keyDown(rowFor("Great stay!"), { key: "Enter" });
    expect(rowFor("Great stay!")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(rowFor("Good location"), { key: " " });
    expect(rowFor("Good location")).toHaveAttribute("aria-selected", "true");
  });

  test("closes the details panel", async () => {
    render(<ReviewApprovalPage />);
    await screen.findByRole("complementary", { name: "Review details" });

    fireEvent.click(screen.getByRole("button", { name: "Close review details" }));

    expect(screen.queryByRole("complementary", { name: "Review details" })).toBeNull();
  });

  test("uses the row selector to show one review at a time and close its details", async () => {
    render(<ReviewApprovalPage />);
    const first = await screen.findByRole("checkbox", { name: "Show review details for Great stay!" });
    const second = screen.getByRole("checkbox", { name: "Show review details for Good location" });

    expect(first).toBeChecked();
    fireEvent.click(second);
    expect(first).not.toBeChecked();
    expect(second).toBeChecked();
    expect(within(details()).getByText("Nice location and easy check-in.")).toBeInTheDocument();

    fireEvent.click(second);
    expect(second).not.toBeChecked();
    expect(screen.queryByRole("complementary", { name: "Review details" })).toBeNull();
  });

  test("approves a review with its version, removes it and opens the next one", async () => {
    approveReview.mockResolvedValue({ ...pendingReview(), status: "APPROVED" });
    render(<ReviewApprovalPage />);
    await waitFor(() => rowFor("Great stay!"));

    fireEvent.click(within(rowFor("Great stay!")).getByRole("button", { name: "Approve" }));

    expect(approveReview).toHaveBeenCalledWith("r1", 1790000000000);
    expect(await screen.findByText("“Great stay!” is approved and awaiting publication.")).toBeInTheDocument();
    expect(within(table()).queryByText("Great stay!")).toBeNull();
    expect(screen.getByRole("tab", { name: "Pending approval (1)" })).toBeInTheDocument();
    expect(within(details()).getByText("Nice location and easy check-in.")).toBeInTheDocument();
  });

  test("keeps the review and shows the reason when approval fails", async () => {
    approveReview.mockRejectedValue(new Error("Review changed. Reload before continuing."));
    render(<ReviewApprovalPage />);
    await screen.findByRole("complementary", { name: "Review details" });

    fireEvent.click(within(details()).getByRole("button", { name: "Approve review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Review changed. Reload before continuing.");
    expect(rowFor("Great stay!")).toBeInTheDocument();
  });

  test("disables approval for a review while its request is in flight", async () => {
    approveReview.mockReturnValue(new Promise(() => {}));
    render(<ReviewApprovalPage />);
    await waitFor(() => rowFor("Great stay!"));

    fireEvent.click(within(rowFor("Great stay!")).getByRole("button", { name: "Approve" }));

    expect(within(rowFor("Great stay!")).getByRole("button", { name: "Approving…" })).toBeDisabled();
    expect(within(details()).getByRole("button", { name: "Approving…" })).toBeDisabled();
    fireEvent.click(within(details()).getByRole("button", { name: "Approving…" }));
    expect(approveReview).toHaveBeenCalledTimes(1);
  });

  test("searches by guest, property or booking and shows an empty result", async () => {
    render(<ReviewApprovalPage />);
    await waitFor(() => rowFor("Great stay!"));
    const search = screen.getByRole("searchbox", { name: "Search reviews" });

    fireEvent.change(search, { target: { value: "dom00122" } });
    expect(within(table()).queryByText("Great stay!")).toBeNull();
    expect(rowFor("Good location")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–1 of 1 review")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "nobody" } });
    expect(screen.getByText("No pending reviews match your search.")).toBeInTheDocument();
  });

  test("does not keep a filtered-out review open in the details panel", async () => {
    render(<ReviewApprovalPage />);
    await waitFor(() => rowFor("Great stay!"));
    fireEvent.click(within(rowFor("Great stay!")).getByRole("button", { name: "View" }));

    fireEvent.change(screen.getByRole("searchbox", { name: "Search reviews" }), { target: { value: "dom00122" } });

    expect(within(details()).getByText("Nice location and easy check-in.")).toBeInTheDocument();
    expect(within(details()).queryByText("The apartment was clean, modern and well equipped.")).toBeNull();
  });

  test("filters by star rating", async () => {
    render(<ReviewApprovalPage />);
    await waitFor(() => rowFor("Great stay!"));

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Rating" }), { target: { value: "3" } });

    expect(within(table()).queryByText("Great stay!")).toBeNull();
    expect(rowFor("Good location")).toBeInTheDocument();
  });

  test("pages through more than eight reviews", async () => {
    getAdminReviews.mockResolvedValue(
      Array.from({ length: 9 }, (_, index) =>
        pendingReview({ id: `r${index}`, title: `Review ${index + 1}`, booking_id: `B${index}` })
      )
    );
    render(<ReviewApprovalPage />);
    await waitFor(() => rowFor("Review 1"));

    expect(screen.getByText("Showing 1–8 of 9 reviews")).toBeInTheDocument();
    fireEvent.click(within(rowFor("Review 2")).getByRole("button", { name: "View" }));
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(rowFor("Review 9")).toBeInTheDocument();
    expect(within(details()).getAllByText("Review 9")).toHaveLength(2);
    expect(within(table()).queryByText("Review 1")).toBeNull();
    expect(screen.getByText("Showing 9–9 of 9 reviews")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("says so when nothing is waiting for approval", async () => {
    getAdminReviews.mockResolvedValue([]);
    render(<ReviewApprovalPage />);

    expect(await screen.findByText("No reviews are waiting for approval.")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Review details" })).toBeNull();
  });

  test("tells a caller without an approver role that access is limited", async () => {
    getAdminReviews.mockRejectedValue(
      Object.assign(new Error("Administrator access is required."), {
        status: 403,
      })
    );
    render(<ReviewApprovalPage />);

    expect(await screen.findByRole("heading", { name: "Not authorized" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  test("offers a retry when the queue cannot load", async () => {
    getAdminReviews.mockRejectedValueOnce(new Error("Could not load reviews waiting for approval."));
    render(<ReviewApprovalPage />);

    expect(await screen.findByText("Could not load reviews waiting for approval.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await waitFor(() => rowFor("Great stay!"))).toBeInTheDocument();
    expect(getAdminReviews).toHaveBeenCalledTimes(2);
  });
});
