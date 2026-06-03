import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import Pages from "./Pages2";
import { getChannexAdminAccess } from "./hostintegrations/channexApi";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
  },
}));

jest.mock("./hostintegrations/channexApi", () => ({
  getChannexAdminAccess: jest.fn(),
}));

const renderPages = () =>
  render(
    <MemoryRouter>
      <Pages />
    </MemoryRouter>
  );

describe("Pages2 Channex certification navigation", () => {
  beforeEach(() => {
    delete process.env.REACT_APP_CHANNEX_CERTIFICATION_USER_IDS;
    jest.clearAllMocks();
    Auth.currentAuthenticatedUser.mockResolvedValue({
      attributes: { sub: "allowed-user" },
    });
  });

  test("shows Channex certification nav item when backend admin-access allows the user", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });

    renderPages();

    expect(await screen.findByText("Channex Certification")).toBeTruthy();
    expect(getChannexAdminAccess).toHaveBeenCalledWith({ userId: "allowed-user" });
  });

  test("hides Channex certification nav item when backend admin-access denies the user", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: false });

    renderPages();

    await waitFor(() => expect(getChannexAdminAccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Channex Certification")).toBeNull();
  });

  test("hides Channex certification nav item when backend admin-access errors", async () => {
    getChannexAdminAccess.mockRejectedValue(new Error("access check failed"));

    renderPages();

    await waitFor(() => expect(getChannexAdminAccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Channex Certification")).toBeNull();
  });
});
