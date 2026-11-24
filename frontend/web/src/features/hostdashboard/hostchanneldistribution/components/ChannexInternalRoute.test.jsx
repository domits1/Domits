import React from "react";
import { render, screen } from "@testing-library/react";
import ChannexInternalRoute, { CHECKING_MESSAGE, NOT_AVAILABLE_MESSAGE } from "./ChannexInternalRoute";
import { loadChannexAccess } from "../../channexadmin/channexCertificationAccess";

jest.mock("../../channexadmin/channexCertificationAccess", () => ({
  loadChannexAccess: jest.fn(),
}));

const renderGuard = () =>
  render(
    <ChannexInternalRoute>
      <p>Distribution page</p>
    </ChannexInternalRoute>
  );

describe("ChannexInternalRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows a checking sentence and hides the page while access is pending", () => {
    loadChannexAccess.mockReturnValue(new Promise(() => {}));

    renderGuard();

    expect(screen.getByRole("status").textContent).toBe(CHECKING_MESSAGE);
    expect(screen.queryByText("Distribution page")).toBeNull();
  });

  test("renders the page for an allowlisted user", async () => {
    loadChannexAccess.mockResolvedValue(true);

    renderGuard();

    expect(await screen.findByText("Distribution page")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("shows the not-available sentence and no page when access is denied", async () => {
    loadChannexAccess.mockResolvedValue(false);

    renderGuard();

    expect((await screen.findByRole("alert")).textContent).toBe(NOT_AVAILABLE_MESSAGE);
    expect(screen.queryByText("Distribution page")).toBeNull();
  });

  test("denies access when the user lookup rejects, for example when signed out", async () => {
    loadChannexAccess.mockRejectedValue(new Error("The user is not authenticated"));

    renderGuard();

    expect((await screen.findByRole("alert")).textContent).toBe(NOT_AVAILABLE_MESSAGE);
    expect(screen.queryByText("Distribution page")).toBeNull();
  });

  test("denies access for any answer other than an explicit true", async () => {
    loadChannexAccess.mockResolvedValue("true");

    renderGuard();

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Distribution page")).toBeNull();
  });
});
