import React from "react";
import { render, screen } from "@testing-library/react";
import PropertyReviewPage from "./PropertyReviewPage";
import { checkPropertyReviewAccess } from "./propertyReviewAccess";

jest.mock("./propertyReviewAccess", () => ({
  checkPropertyReviewAccess: jest.fn(),
}));

describe("PropertyReviewPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows the checking state while access is being verified", () => {
    checkPropertyReviewAccess.mockReturnValue(new Promise(() => {}));

    render(<PropertyReviewPage />);

    expect(screen.getByText("Checking access")).toBeTruthy();
  });

  test("shows the placeholder when access is allowed", async () => {
    checkPropertyReviewAccess.mockResolvedValue(true);

    render(<PropertyReviewPage />);

    expect(await screen.findByRole("heading", { name: "Property review" })).toBeTruthy();
    expect(screen.getByText("Queue coming soon")).toBeTruthy();
    expect(screen.queryByText("Not authorized")).toBeNull();
  });

  test("shows not authorized when access is denied", async () => {
    checkPropertyReviewAccess.mockResolvedValue(false);

    render(<PropertyReviewPage />);

    expect(await screen.findByText("Not authorized")).toBeTruthy();
    expect(screen.queryByText("Queue coming soon")).toBeNull();
  });

  test("shows not authorized when the access check rejects", async () => {
    checkPropertyReviewAccess.mockRejectedValue(new Error("boom"));

    render(<PropertyReviewPage />);

    expect(await screen.findByText("Not authorized")).toBeTruthy();
  });
});
