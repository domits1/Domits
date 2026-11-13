import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MainDashboardHost from "../../mainDashboardHost";

jest.mock("../../Pages2", () => () => null);

jest.mock("./HostOwners", () => () => "Owners list page");

jest.mock("./HostOwnerDetail", () => {
  const { useParams: useRouteParams } = jest.requireActual("react-router-dom");
  return () => `Owner detail page for ${useRouteParams().id}`;
});

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/hostdashboard/*" element={<MainDashboardHost />} />
      </Routes>
    </MemoryRouter>
  );

describe("Owner detail route", () => {
  test("serves the owner detail page at owners/:id with the id from the path", () => {
    renderAt("/hostdashboard/owners/owner-1");

    expect(screen.getByText("Owner detail page for owner-1")).toBeTruthy();
  });

  test("keeps serving the owners list at owners", () => {
    renderAt("/hostdashboard/owners");

    expect(screen.getByText("Owners list page")).toBeTruthy();
  });
});
