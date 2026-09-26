// Review: Covers public summary, cards, filters, loading, empty, and error states.

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ReviewsSection from "./ReviewsSection";

const reviews = [
  {
    id: "review-1",
    overallRating: 5,
    title: "Wonderful stay",
    publicReview: "Clean, calm, and close to everything we needed.",
    verificationStatus: "VERIFIED_STAY",
    status: "PUBLISHED",
    createdAt: Date.parse("2026-09-01T10:00:00.000Z"),
    categoryRatings: {
      cleanliness: 5,
      communication: 5,
    },
  },
  {
    id: "review-2",
    overallRating: 4,
    title: "Comfortable place",
    publicReview: "The host was responsive and the listing matched the photos.",
    verificationStatus: "UNVERIFIED",
    status: "PUBLISHED",
    createdAt: Date.parse("2026-08-21T10:00:00.000Z"),
    categoryRatings: {
      cleanliness: 4,
      communication: 5,
    },
  },
];

describe("ReviewsSection", () => {
  test("renders review summary with average score and total count", () => {
    render(
      <ReviewsSection
        reviews={reviews}
        overallRating={4.5}
        totalReviews={2}
        verifiedReviewCount={1}
        categoryScores={{
          cleanliness: 4.5,
          communication: 5,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /guest reviews/i })).toBeInTheDocument();
    expect(screen.getByLabelText("4.5 out of 5 stars")).toBeInTheDocument();
    expect(screen.getByText("2 reviews")).toBeInTheDocument();
    expect(screen.getByText("1 verified")).toBeInTheDocument();
  });

  test("renders available category scores and skips missing categories", () => {
    render(
      <ReviewsSection
        reviews={reviews}
        overallRating={4.5}
        totalReviews={2}
        categoryScores={{
          cleanliness: 4.5,
          communication: 5,
        }}
      />
    );

    // Category names can appear in both summary pills and the category filter.
    expect(screen.getAllByText("Cleanliness").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Communication").length).toBeGreaterThan(0);
    expect(screen.queryByText("Amenities")).not.toBeInTheDocument();
  });

  test("renders public review list", () => {
    render(
      <ReviewsSection
        reviews={reviews}
        overallRating={4.5}
        totalReviews={2}
        categoryScores={{
          cleanliness: 4.5,
        }}
      />
    );

    expect(screen.getByText("Clean, calm, and close to everything we needed.")).toBeInTheDocument();
    expect(screen.getByText("The host was responsive and the listing matched the photos.")).toBeInTheDocument();
  });

  test("shows verified stay badge only for verified reviews", () => {
    render(
      <ReviewsSection
        reviews={reviews}
        overallRating={4.5}
        totalReviews={2}
        verifiedReviewCount={1}
        categoryScores={{
          cleanliness: 4.5,
        }}
      />
    );

    const cards = screen.getAllByRole("article");

    expect(within(cards[0]).getByText("Verified stay")).toBeInTheDocument();
    expect(within(cards[1]).queryByText("Verified stay")).not.toBeInTheDocument();
  });

  test("renders loading state", () => {
    const { container } = render(<ReviewsSection isLoading />);

    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  test("renders empty state", () => {
    render(<ReviewsSection reviews={[]} totalReviews={0} categoryScores={{}} />);

    expect(screen.getByText("No public reviews yet.")).toBeInTheDocument();
  });

  test("updates sort and filter controls", () => {
    const onSortChange = jest.fn();
    const onVerifiedOnlyChange = jest.fn();
    const onCategoryFilterChange = jest.fn();
    const onClearFilters = jest.fn();

    render(
      <ReviewsSection
        reviews={reviews}
        overallRating={4.5}
        totalReviews={2}
        categoryScores={{
          cleanliness: 4.5,
          communication: 5,
        }}
        sortValue="highest"
        verifiedOnly
        categoryFilter="cleanliness"
        onSortChange={onSortChange}
        onVerifiedOnlyChange={onVerifiedOnlyChange}
        onCategoryFilterChange={onCategoryFilterChange}
        onClearFilters={onClearFilters}
      />
    );

    // Review controls emit the selected values to the listing page.
    fireEvent.change(screen.getByLabelText("Sort reviews"), {
      target: { value: "lowest" },
    });
    fireEvent.click(screen.getByLabelText("Verified stays only"));
    fireEvent.change(screen.getByLabelText("Filter by category"), {
      target: { value: "communication" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onSortChange).toHaveBeenCalledWith("lowest");
    expect(onVerifiedOnlyChange).toHaveBeenCalledWith(false);
    expect(onCategoryFilterChange).toHaveBeenCalledWith("communication");
    expect(onClearFilters).toHaveBeenCalled();
  });

  test("renders filtered empty state", () => {
    render(
      <ReviewsSection
        reviews={[]}
        totalReviews={0}
        categoryScores={{ cleanliness: 4 }}
        verifiedOnly
        categoryFilter="cleanliness"
      />
    );

    expect(screen.getByText("No reviews match the selected filters.")).toBeInTheDocument();
  });

  test("renders error state", () => {
    render(<ReviewsSection error="Could not load reviews." />);

    expect(screen.getByText("Could not load reviews.")).toBeInTheDocument();
  });
});
