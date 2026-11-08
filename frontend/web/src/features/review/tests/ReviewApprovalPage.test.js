import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ReviewApprovalPage from "../views/ReviewApprovalPage";
import { approveReview, getPendingApprovalReviews } from "../services/reviewAPI";

jest.mock("../services/reviewAPI", () => ({
  approveReview: jest.fn(),
  getPendingApprovalReviews: jest.fn(),
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
    jest.clearAllMocks();
    getPendingApprovalReviews.mockResolvedValue([pendingReview(), secondReview]);
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

  test("closes the details panel", async () => {
    render(<ReviewApprovalPage />);
    await screen.findByRole("complementary", { name: "Review details" });

    fireEvent.click(screen.getByRole("button", { name: "Close review details" }));

    expect(screen.queryByRole("complementary", { name: "Review details" })).toBeNull();
  });

  test("approves a review with its version, removes it and opens the next one", async () => {
    approveReview.mockResolvedValue({ ...pendingReview(), status: "PUBLISHED" });
    render(<ReviewApprovalPage />);
    await waitFor(() => rowFor("Great stay!"));

    fireEvent.click(within(rowFor("Great stay!")).getByRole("button", { name: "Approve" }));

    expect(approveReview).toHaveBeenCalledWith("r1", 1790000000000);
    expect(await screen.findByText("“Great stay!” is approved and published.")).toBeInTheDocument();
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

    fireEvent.change(screen.getByRole("combobox", { name: "Rating" }), { target: { value: "3" } });

    expect(within(table()).queryByText("Great stay!")).toBeNull();
    expect(rowFor("Good location")).toBeInTheDocument();
  });

  test("pages through more than eight reviews", async () => {
    getPendingApprovalReviews.mockResolvedValue(
      Array.from({ length: 9 }, (_, index) =>
        pendingReview({ id: `r${index}`, title: `Review ${index + 1}`, booking_id: `B${index}` })
      )
    );
    render(<ReviewApprovalPage />);
    await waitFor(() => rowFor("Review 1"));

    expect(screen.getByText("Showing 1–8 of 9 reviews")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(rowFor("Review 9")).toBeInTheDocument();
    expect(within(table()).queryByText("Review 1")).toBeNull();
    expect(screen.getByText("Showing 9–9 of 9 reviews")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("says so when nothing is waiting for approval", async () => {
    getPendingApprovalReviews.mockResolvedValue([]);
    render(<ReviewApprovalPage />);

    expect(await screen.findByText("No reviews are waiting for approval.")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Review details" })).toBeNull();
  });

  test("tells a caller without an approver role that access is limited", async () => {
    getPendingApprovalReviews.mockRejectedValue(
      Object.assign(new Error("Administrator access is required."), {
        status: 403,
      })
    );
    render(<ReviewApprovalPage />);

    expect(await screen.findByRole("heading", { name: "Not authorized" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  test("offers a retry when the queue cannot load", async () => {
    getPendingApprovalReviews.mockRejectedValueOnce(new Error("Could not load reviews waiting for approval."));
    render(<ReviewApprovalPage />);

    expect(await screen.findByText("Could not load reviews waiting for approval.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await waitFor(() => rowFor("Great stay!"))).toBeInTheDocument();
    expect(getPendingApprovalReviews).toHaveBeenCalledTimes(2);
  });
});
