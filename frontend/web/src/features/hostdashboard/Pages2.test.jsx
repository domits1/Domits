import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import Pages from "./Pages2";
import { getChannexAdminAccess } from "./hostintegrations/channexApi";
import useEffectiveHostId from "../../hooks/useEffectiveHostId";

jest.mock("../../hooks/useEffectiveHostId", () => jest.fn());

beforeEach(() => {
  useEffectiveHostId.mockReturnValue({ isPurelyPOM: false });
});

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

describe("Pages2 missed revenue navigation", () => {
  test("does not show a missed revenue nav link while the tab is hidden", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: false });
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { sub: "any-user" } });

    renderPages();

    await screen.findByText("Dashboard");
    expect(screen.queryByRole("link", { name: /missed revenue/i })).toBeNull();
  });
});

describe("Pages2 owners navigation", () => {
  beforeEach(() => {
    getChannexAdminAccess.mockResolvedValue({ allowed: false });
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { sub: "any-user" } });
  });

  test("shows the Owners link to a host", async () => {
    useEffectiveHostId.mockReturnValue({ isPurelyPOM: false });

    renderPages();

    const ownersLink = await screen.findByRole("link", { name: "Owners" });
    expect(ownersLink.getAttribute("href")).toBe("/owners");
  });

  test("hides the Owners link from a team member who acts for another host", async () => {
    useEffectiveHostId.mockReturnValue({ isPurelyPOM: true });

    renderPages();

    await screen.findByText("Listings");
    expect(screen.queryByRole("link", { name: "Owners" })).toBeNull();
  });
});

describe("Pages2 menu order", () => {
  const visibleLabels = () => screen.getAllByRole("link").map((link) => link.textContent);

  beforeEach(() => {
    useEffectiveHostId.mockReturnValue({ isPurelyPOM: false });
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { sub: "any-user" } });
  });

  test("puts Reviews directly before Owners and Marketplace directly before Settings for a host", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: false });

    renderPages();

    await waitFor(() => expect(getChannexAdminAccess).toHaveBeenCalled());
    await screen.findByRole("link", { name: "Owners" });
    const labels = visibleLabels();
    expect(labels.indexOf("Owners")).toBe(labels.indexOf("Reviews") + 1);
    expect(labels.indexOf("Settings")).toBe(labels.indexOf("Marketplace") + 1);
  });

  test("keeps Marketplace directly before Settings when Channex diagnostics is visible", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });

    renderPages();

    await screen.findByRole("link", { name: "Channex diagnostics" });
    const labels = visibleLabels();
    expect(labels.indexOf("Settings")).toBe(labels.indexOf("Marketplace") + 1);
  });
});

describe("Pages2 Channex diagnostics navigation", () => {
  beforeEach(() => {
    delete process.env.REACT_APP_CHANNEX_CERTIFICATION_USER_IDS;
    jest.clearAllMocks();
    Auth.currentAuthenticatedUser.mockResolvedValue({
      attributes: { sub: "allowed-user" },
    });
  });

  test("shows Channex diagnostics nav item when backend admin-access allows the user", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });

    renderPages();

    expect(await screen.findByText("Channex diagnostics")).toBeTruthy();
    expect(screen.queryByText(/certification/i)).toBeNull();
    expect(getChannexAdminAccess).toHaveBeenCalledWith({ userId: "allowed-user" });
  });

  test("hides Channex diagnostics nav item when backend admin-access denies the user", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: false });

    renderPages();

    await waitFor(() => expect(getChannexAdminAccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Channex diagnostics")).toBeNull();
  });

  test("hides Channex diagnostics nav item when backend admin-access errors", async () => {
    getChannexAdminAccess.mockRejectedValue(new Error("access check failed"));

    renderPages();

    await waitFor(() => expect(getChannexAdminAccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Channex diagnostics")).toBeNull();
  });
});
