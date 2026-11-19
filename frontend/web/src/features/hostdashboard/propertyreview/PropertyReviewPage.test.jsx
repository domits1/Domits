import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PropertyReviewPage from "./PropertyReviewPage";
import { checkPropertyReviewAccess } from "./propertyReviewAccess";

jest.mock("./propertyReviewAccess", () => ({
  PROPERTY_REVIEW_ACCESS: { ALLOWED: "allowed", DENIED: "denied", UNAVAILABLE: "unavailable" },
  checkPropertyReviewAccess: jest.fn(),
}));

jest.mock("./queue/PropertyReviewQueue", () => () => <div>Queue stub</div>);

describe("PropertyReviewPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows the checking state while access is being verified", () => {
    checkPropertyReviewAccess.mockReturnValue(new Promise(() => {}));

    render(<PropertyReviewPage />);

    expect(screen.getByText("Checking access")).toBeTruthy();
  });

  test("shows the review queue when access is allowed", async () => {
    checkPropertyReviewAccess.mockResolvedValue("allowed");

    render(<PropertyReviewPage />);

    expect(await screen.findByRole("heading", { name: "Property review" })).toBeTruthy();
    expect(screen.getByText("Queue stub")).toBeTruthy();
    expect(screen.queryByText("Not authorized")).toBeNull();
  });

  test("shows not authorized when access is denied", async () => {
    checkPropertyReviewAccess.mockResolvedValue("denied");

    render(<PropertyReviewPage />);

    expect(await screen.findByText("Not authorized")).toBeTruthy();
    expect(screen.queryByText("Queue stub")).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  test("offers a retry instead of not authorized when the check is unavailable", async () => {
    checkPropertyReviewAccess.mockResolvedValue("unavailable");

    render(<PropertyReviewPage />);

    expect(await screen.findByText("Could not check your access. Try again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByText("Not authorized")).toBeNull();
  });

  test("treats a rejected access check as unavailable", async () => {
    checkPropertyReviewAccess.mockRejectedValue(new Error("boom"));

    render(<PropertyReviewPage />);

    expect(await screen.findByText("Could not check your access. Try again.")).toBeTruthy();
  });

  test("retry checks again and shows the page once access is allowed", async () => {
    checkPropertyReviewAccess.mockResolvedValueOnce("unavailable").mockResolvedValueOnce("allowed");

    render(<PropertyReviewPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Queue stub")).toBeTruthy();
    expect(checkPropertyReviewAccess).toHaveBeenCalledTimes(2);
  });
});
