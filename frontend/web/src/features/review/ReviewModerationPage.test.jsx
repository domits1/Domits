import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReviewModerationPage from "./ReviewModerationPage";
import {
  getDomitsPrivateFeedback,
  getDomitsPrivateFeedbackInbox,
  getModerationQueue,
  moderateReview,
} from "./reviewModerationAPI";

// Review: Covers moderation decisions and separate Domits-private feedback reads.
jest.mock("./reviewModerationAPI", () => ({
  getModerationQueue: jest.fn(),
  getDomitsPrivateFeedback: jest.fn(),
  getDomitsPrivateFeedbackInbox: jest.fn(),
  moderateReview: jest.fn(),
}));

const review = {
  id: "review-1", bookingId: "booking-1", title: "A stay", publicReview: "Visit https://example.com",
  overallRating: 2, status: "SUBMITTED", createdAt: 1789041600000, categoryRatings: { cleanliness: 2 },
  verification: { status: "NEEDS_REVIEW", evidenceJson: JSON.stringify({ signals: ["EXTERNAL_LINK"] }) },
  moderationHistory: [],
};

describe("review moderation page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getModerationQueue.mockResolvedValue({ reviews: [review] });
    getDomitsPrivateFeedback.mockResolvedValue({ feedback: [] });
    getDomitsPrivateFeedbackInbox.mockResolvedValue({ feedback: [] });
  });

  test("requires a reason before approving a flagged review", async () => {
    moderateReview.mockResolvedValue({});
    render(<ReviewModerationPage />);
    expect(await screen.findByText("Visit https://example.com")).toBeInTheDocument();
    const approve = screen.getByRole("button", { name: "Approve review" });
    expect(approve).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Link is relevant to stay" } });
    fireEvent.click(approve);
    await waitFor(() => expect(moderateReview).toHaveBeenCalledWith("review-1", "APPROVE", "Link is relevant to stay", ""));
  });

  test("shows a backend authorization error", async () => {
    getModerationQueue.mockRejectedValue(new Error("Moderator access is required."));
    render(<ReviewModerationPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Moderator access is required.");
  });

  test("loads Domits private feedback separately when requested", async () => {
    getDomitsPrivateFeedback.mockResolvedValue({
      feedback: [{ id: "feedback-1", message: "The payment receipt was confusing.", createdAt: 1789041600000 }],
    });
    render(<ReviewModerationPage />);

    await screen.findByText("Visit https://example.com");
    expect(getDomitsPrivateFeedback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "View private feedback" }));

    expect(await screen.findByText("The payment receipt was confusing.")).toBeInTheDocument();
    expect(getDomitsPrivateFeedback).toHaveBeenCalledWith("review-1");
  });

  test("shows an authorization error without exposing private feedback", async () => {
    getDomitsPrivateFeedback.mockRejectedValue(new Error("Only authorized Domits internal users can view this feedback."));
    render(<ReviewModerationPage />);

    await screen.findByText("Visit https://example.com");
    fireEvent.click(screen.getByRole("button", { name: "View private feedback" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only authorized Domits internal users can view this feedback."
    );
    expect(screen.queryByText("The payment receipt was confusing.")).not.toBeInTheDocument();
  });

  test("opens the Domits feedback inbox independently of the moderation queue", async () => {
    getDomitsPrivateFeedbackInbox.mockResolvedValue({
      feedback: [{
        id: "feedback-2", propertyId: "property-1", reservationId: "booking-2",
        message: "The receipt needs a clearer breakdown.", createdAt: 1789041600000,
      }],
    });
    render(<ReviewModerationPage />);

    await screen.findByText("Visit https://example.com");
    fireEvent.click(screen.getByRole("button", { name: "Open inbox" }));

    expect(await screen.findByText("The receipt needs a clearer breakdown.")).toBeInTheDocument();
    expect(screen.getByText("Property property-1")).toBeInTheDocument();
    expect(getDomitsPrivateFeedbackInbox).toHaveBeenCalledTimes(1);
  });
});
