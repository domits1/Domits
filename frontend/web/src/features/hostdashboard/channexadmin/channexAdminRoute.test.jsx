import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import MainDashboardHost from "../mainDashboardHost";
import { CHANNEX_CERTIFICATION_ADMIN_ROUTE } from "./channexCertificationAccess";

jest.mock("../Pages2", () => () => null);

jest.mock("./ChannexCertificationAdminPage", () => () => "Channex admin page");

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
