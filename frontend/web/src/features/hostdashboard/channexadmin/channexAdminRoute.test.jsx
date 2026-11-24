import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import MainDashboardHost from "../mainDashboardHost";
import { CHANNEX_CERTIFICATION_ADMIN_ROUTE, loadChannexAccess } from "./channexCertificationAccess";

jest.mock("../Pages2", () => () => null);

jest.mock("./ChannexCertificationAdminPage", () => () => "Channex admin page");

jest.mock("../hostchanneldistribution/views/HostChannelDistribution", () => () => "Distribution page");

jest.mock("./channexCertificationAccess", () => ({
  ...jest.requireActual("./channexCertificationAccess"),
  loadChannexAccess: jest.fn(),
}));

function LocationDisplay() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

const renderHostDashboardAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/hostdashboard/*"
          element={
            <>
              <MainDashboardHost />
              <LocationDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("Channex admin route", () => {
  test("serves the Channex admin page at admin/channex-diagnostics", () => {
    renderHostDashboardAt("/hostdashboard/admin/channex-diagnostics");

    expect(CHANNEX_CERTIFICATION_ADMIN_ROUTE).toBe("admin/channex-diagnostics");
    expect(screen.getByText("Channex admin page")).toBeTruthy();
  });

  test("redirects the old admin/channex-certification path to the new one", () => {
    renderHostDashboardAt("/hostdashboard/admin/channex-certification");

    expect(screen.getByTestId("location").textContent).toBe("/hostdashboard/admin/channex-diagnostics");
    expect(screen.getByText("Channex admin page")).toBeTruthy();
  });
});

describe("Distribution route guard", () => {
  test("serves the Distribution page at distribution for an allowlisted user", async () => {
    loadChannexAccess.mockResolvedValue(true);

    renderHostDashboardAt("/hostdashboard/distribution");

    expect(await screen.findByText("Distribution page")).toBeTruthy();
  });

  test("does not serve the Distribution page by URL when the user is not allowlisted", async () => {
    loadChannexAccess.mockResolvedValue(false);

    renderHostDashboardAt("/hostdashboard/distribution");

    expect((await screen.findByRole("alert")).textContent).toBe("Distribution isn't available for this account.");
    expect(screen.queryByText("Distribution page")).toBeNull();
  });
});
