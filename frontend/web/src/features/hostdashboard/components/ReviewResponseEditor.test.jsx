import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReviewResponseEditor from "./ReviewResponseEditor";
import {
  deleteReviewResponse,
  publishReviewResponse,
  saveDraftReviewResponse,
} from "../services/reviewResponseService";

// Review: Covers draft, publish, edit, and delete controls for a host response.
jest.mock("../services/reviewResponseService", () => ({
  deleteReviewResponse: jest.fn(),
  editReviewResponse: jest.fn(),
  publishReviewResponse: jest.fn(),
  saveDraftReviewResponse: jest.fn(),
}));

const styles = {
  responseActions: "responseActions",
  responseDisabled: "responseDisabled",
  responseDraftBadge: "responseDraftBadge",
  responseEditor: "responseEditor",
  responseError: "responseError",
  responseLabel: "responseLabel",
  responsePreview: "responsePreview",
  responsePreviewHeader: "responsePreviewHeader",
  responsePublishedBadge: "responsePublishedBadge",
};

const review = {
  id: "review-1",
  status: "PUBLISHED",
  publicationStatus: "PUBLISHED",
};

describe("ReviewResponseEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saveDraftReviewResponse.mockResolvedValue({ response: { id: "response-1", status: "draft" } });
    publishReviewResponse.mockResolvedValue({ response: { id: "response-1", status: "published" } });
    deleteReviewResponse.mockResolvedValue({ message: "Review response deleted successfully." });
  });

  test("saves a draft response", async () => {
    const onChanged = jest.fn();
    render(<ReviewResponseEditor review={review} onChanged={onChanged} styles={styles} />);

    fireEvent.change(screen.getByPlaceholderText("Write a professional response to this public review."), {
      target: { value: "Thanks for staying." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(saveDraftReviewResponse).toHaveBeenCalledWith("review-1", "Thanks for staying.");
    });
    expect(onChanged).toHaveBeenCalled();
  });

  test("publishes a draft response from preview state", async () => {
    render(
      <ReviewResponseEditor
        review={{
          ...review,
          response: {
            id: "response-1",
            status: "draft",
            message: "Draft response.",
          },
        }}
        styles={styles}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(publishReviewResponse).toHaveBeenCalledWith("review-1", "Draft response.");
    });
  });

  test("shows disabled state for ineligible reviews", () => {
    render(<ReviewResponseEditor review={{ id: "review-1", status: "SUBMITTED" }} styles={styles} />);

    expect(screen.getByText("Public responses are available only after this review is published.")).toBeInTheDocument();
  });
});
