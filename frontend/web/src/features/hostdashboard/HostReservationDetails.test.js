/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HostReservationDetails from "./HostReservationDetails";

// Plain functions, not jest.fn(): the Jest config resets mock implementations before each test.
jest.mock("../../services/getAccessToken.js", () => ({
  getAccessToken: () => null,
  getCognitoUserId: () => null,
}));
jest.mock("../guestdashboard/services/propertySummaryService", () => ({ fetchPropertySummaries: async () => ({}) }));
jest.mock("./services/getReservationsFromToken.js", () => async () => ({}));
jest.mock("react-toastify", () => ({ toast: { error: () => {}, success: () => {} } }));

const renderDetailsFor = (booking) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: `/reservations/${booking.id}`, state: { booking } }]}>
      <Routes>
        <Route path="/reservations/:id" element={<HostReservationDetails />} />
      </Routes>
    </MemoryRouter>
  );

describe("HostReservationDetails status", () => {
  test("shows Cancelled instead of the unknown-status fallback for a cancelled booking", async () => {
    renderDetailsFor({
      id: "booking-1",
      status: "Canceled",
      property_id: "property-1",
      title: "Test Apartment",
      city: "Amsterdam",
      country: "Netherlands",
      arrivaldate: "2026-12-10",
      departuredate: "2026-12-12",
    });

    await screen.findAllByText("Test Apartment");
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
    expect(screen.queryByText("Payment status unavailable")).toBeNull();
  });
});
