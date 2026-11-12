import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MainDashboardHost from "../../hostdashboard/mainDashboardHost";

jest.mock("../../hostdashboard/Pages2", () => () => null);

jest.mock("../views/ReviewApprovalPage", () => () => "Review approval page");

describe("Review approval route", () => {
  test("serves the review approval page at admin/review-approval", () => {
    render(
      <MemoryRouter initialEntries={["/hostdashboard/admin/review-approval"]}>
        <Routes>
          <Route path="/hostdashboard/*" element={<MainDashboardHost />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Review approval page")).toBeTruthy();
    const navigation = screen.getByRole("navigation", { name: "Admin panel" });
    expect(within(navigation).getByRole("link", { name: "Reviews" }).getAttribute("aria-current")).toBe("page");
  });
});
