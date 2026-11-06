import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import Pages from "./Pages2";
import { getChannexAdminAccess } from "./hostintegrations/channexApi";
import { checkPropertyReviewAccess } from "./propertyreview/propertyReviewAccess";
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

jest.mock("./propertyreview/propertyReviewAccess", () => ({
  PROPERTY_REVIEW_ADMIN_ROUTE: "admin/property-review",
  PROPERTY_REVIEW_ACCESS: { ALLOWED: "allowed", DENIED: "denied", UNAVAILABLE: "unavailable" },
  checkPropertyReviewAccess: jest.fn(),
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
    checkPropertyReviewAccess.mockResolvedValue("denied");
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { sub: "any-user" } });

    renderPages();

    await screen.findByText("Dashboard");
    expect(screen.queryByRole("link", { name: /missed revenue/i })).toBeNull();
  });
});

describe("Pages2 owners navigation", () => {
  beforeEach(() => {
    getChannexAdminAccess.mockResolvedValue({ allowed: false });
    checkPropertyReviewAccess.mockResolvedValue("denied");
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { sub: "any-user" } });
  });

  test("shows the Owner Management link to a host, right after Listings", async () => {
    useEffectiveHostId.mockReturnValue({ isPurelyPOM: false });

    renderPages();

    const ownersLink = await screen.findByRole("link", { name: "Owner Management" });
    expect(ownersLink.getAttribute("href")).toBe("/owners");
    const labels = screen.getAllByRole("link").map((link) => link.textContent);
    expect(labels.indexOf("Owner Management")).toBe(labels.indexOf("Listings") + 1);
  });

  test("hides the Owner Management link from a team member who acts for another host", async () => {
    useEffectiveHostId.mockReturnValue({ isPurelyPOM: true });

    renderPages();

    await screen.findByText("Listings");
    expect(screen.queryByRole("link", { name: "Owners" })).toBeNull();
  });
});

describe("Pages2 Channex diagnostics navigation", () => {
  beforeEach(() => {
    delete process.env.REACT_APP_CHANNEX_CERTIFICATION_USER_IDS;
    jest.clearAllMocks();
    checkPropertyReviewAccess.mockResolvedValue("denied");
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

describe("Pages2 Distribution navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkPropertyReviewAccess.mockResolvedValue("allowed");
    Auth.currentAuthenticatedUser.mockResolvedValue({
      attributes: { sub: "any-user" },
    });
  });

  test.each([
    [true, true],
    [false, false],
  ])("with Channex access %s the Distribution nav item is shown: %s", async (channexAllowed, isShown) => {
    getChannexAdminAccess.mockResolvedValue({ allowed: channexAllowed });

    renderPages();

    await screen.findByText("Property review");
    expect(screen.queryByText("Distribution") !== null).toBe(isShown);
  });
});

describe("Pages2 property review navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getChannexAdminAccess.mockResolvedValue({ allowed: false });
    Auth.currentAuthenticatedUser.mockResolvedValue({
      attributes: { sub: "admin-user" },
    });
  });

  test("shows the Property review nav item when the review access check allows the user", async () => {
    checkPropertyReviewAccess.mockResolvedValue("allowed");

    renderPages();

    const link = await screen.findByRole("link", { name: /property review/i });
    expect(link.getAttribute("href")).toBe("/admin/property-review");
  });

  test("hides the Property review nav item when the review access check denies the user", async () => {
    checkPropertyReviewAccess.mockResolvedValue("denied");

    renderPages();

    await waitFor(() => expect(checkPropertyReviewAccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Property review")).toBeNull();
  });

  test("hides the Property review nav item when the review access check errors", async () => {
    checkPropertyReviewAccess.mockRejectedValue(new Error("access check failed"));

    renderPages();

    await waitFor(() => expect(checkPropertyReviewAccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Property review")).toBeNull();
  });

  test("shows the Channex items without waiting for a review access check that never settles", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });
    checkPropertyReviewAccess.mockReturnValue(new Promise(() => {}));

    renderPages();

    expect(await screen.findByText("Channex diagnostics")).toBeTruthy();
    expect(screen.getByText("Distribution")).toBeTruthy();
    expect(screen.queryByText("Property review")).toBeNull();
  });

  test("shows the Property review item without waiting for a Channex access check that never settles", async () => {
    getChannexAdminAccess.mockReturnValue(new Promise(() => {}));
    checkPropertyReviewAccess.mockResolvedValue("allowed");

    renderPages();

    expect(await screen.findByText("Property review")).toBeTruthy();
    expect(screen.queryByText("Channex diagnostics")).toBeNull();
  });

  test("keeps the Channex item visible when the review access check fails", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });
    checkPropertyReviewAccess.mockRejectedValue(new Error("access check failed"));

    renderPages();

    expect(await screen.findByText("Channex diagnostics")).toBeTruthy();
    expect(screen.queryByText("Property review")).toBeNull();
  });

  test("keeps the Property review item visible when the Channex access check fails", async () => {
    getChannexAdminAccess.mockRejectedValue(new Error("access check failed"));
    checkPropertyReviewAccess.mockResolvedValue("allowed");

    renderPages();

    expect(await screen.findByText("Property review")).toBeTruthy();
    expect(screen.queryByText("Channex diagnostics")).toBeNull();
  });

  test("shows both admin items when both checks allow the user", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });
    checkPropertyReviewAccess.mockResolvedValue("allowed");

    renderPages();

    expect(await screen.findByText("Channex diagnostics")).toBeTruthy();
    expect(await screen.findByText("Property review")).toBeTruthy();
  });
});
