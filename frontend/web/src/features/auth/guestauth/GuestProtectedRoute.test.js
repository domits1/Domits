import React from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import GuestProtectedRoute from "./GuestProtectedRoute";
import { useUser } from "../UserContext";

// Review: Verifies that reminder deep links retain their booking context through login.
jest.mock("../UserContext", () => ({ useUser: jest.fn() }));

const CurrentLocation = () => {
  const location = useLocation();
  return <span>{`${location.pathname}${location.search}`}</span>;
};

describe("GuestProtectedRoute", () => {
  it("keeps the email review link through login for a signed-out guest", () => {
    useUser.mockReturnValue({ role: null, isLoading: false });

    render(
      <MemoryRouter initialEntries={["/guestdashboard/reviews/new?bookingId=booking-1&propertyId=property-1"]}>
        <Routes>
          <Route
            path="/guestdashboard/reviews/new"
            element={
              <GuestProtectedRoute>
                <div>Review form</div>
              </GuestProtectedRoute>
            }
          />
          <Route path="/login" element={<CurrentLocation />} />
        </Routes>
      </MemoryRouter>
    );

    const loginLocation = screen.getByText(/\/login\?redirect=/).textContent;
    expect(new URLSearchParams(loginLocation.split("?")[1]).get("redirect")).toBe(
      "/guestdashboard/reviews/new?bookingId=booking-1&propertyId=property-1"
    );
    expect(screen.queryByText("Review form")).not.toBeInTheDocument();
  });
});
