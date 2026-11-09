import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MainDashboardHost from "../mainDashboardHost";

jest.mock("../Pages2", () => () => null);

jest.mock("./PropertyReviewPage", () => () => "Property review page");

jest.mock("./detail/PropertyReviewDetailPage", () => () => "Property review detail page");

describe("Property review route", () => {
  test("serves the property review page at admin/property-review", () => {
    render(
      <MemoryRouter initialEntries={["/hostdashboard/admin/property-review"]}>
        <Routes>
          <Route path="/hostdashboard/*" element={<MainDashboardHost />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Property review page")).toBeTruthy();
  });

  test("serves the detail page at admin/property-review/:propertyId", () => {
    render(
      <MemoryRouter initialEntries={["/hostdashboard/admin/property-review/p1"]}>
        <Routes>
          <Route path="/hostdashboard/*" element={<MainDashboardHost />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Property review detail page")).toBeTruthy();
  });
});
