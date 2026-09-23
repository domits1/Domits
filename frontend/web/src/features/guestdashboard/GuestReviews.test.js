import React from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GuestReviews from "./GuestReviews";
import { getGuestReviewHistory } from "./services/reviewAPI";

jest.mock("./services/reviewAPI", () => ({
  getGuestReviewHistory: jest.fn(),
}));

const renderPage = () => render(
  <MemoryRouter>
    <GuestReviews />
  </MemoryRouter>
);

describe("guest review history", () => {
  afterEach(() => jest.clearAllMocks());

  test("shows an error instead of an empty history when loading fails", async () => {
    getGuestReviewHistory.mockRejectedValueOnce(new Error("Review service is not configured."));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Review service is not configured.");
    expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
  });

  test("retries after a failed request and shows an empty history on success", async () => {
    getGuestReviewHistory
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce([]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to fetch");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getByText("No reviews yet")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getGuestReviewHistory).toHaveBeenCalledTimes(2);
  });
});
